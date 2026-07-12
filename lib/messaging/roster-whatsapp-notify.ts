import { prisma } from "@/lib/prisma";
import { messagingMonthKey } from "@/lib/messaging/month-key";
import { toWhatsappAddress } from "@/lib/messaging/phone-whatsapp";
import {
  getTwilioWhatsappConfig,
  sendWhatsappTemplate,
  twilioWhatsappConfigured,
} from "@/lib/messaging/twilio-whatsapp";
import { getWhatsappAccess } from "@/lib/messaging/whatsapp-access";
import {
  filterRosterStaffForWeek,
  staffIdsWithRosterEntries,
} from "@/lib/roster-display-staff";
import { formatYmdInZone } from "@/lib/datetime-policy";
import { weekEndYmd, ymdForDbDate } from "@/lib/roster-week";

export const ROSTER_NOTIFY_CHANNEL_WHATSAPP = "whatsapp";
export const ROSTER_NOTIFY_KIND_PUBLISH = "publish";
export const ROSTER_NOTIFY_KIND_DIRECT = "direct";

export type RosterWhatsappNotifyKind =
  | typeof ROSTER_NOTIFY_KIND_PUBLISH
  | typeof ROSTER_NOTIFY_KIND_DIRECT;

export type RosterWhatsappNotifySummary = {
  configured: boolean;
  enabled: boolean;
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
  capReached: boolean;
  reasons: string[];
  mediaUrl?: string;
};

async function incrementWhatsappSentCount(organizationId: string, delta: number): Promise<void> {
  if (delta <= 0) return;
  const month = messagingMonthKey();
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { whatsappSentMonth: true, whatsappSentCount: true },
    });
    if (!org) return;

    const reset = org.whatsappSentMonth !== month;
    const nextCount = (reset ? 0 : org.whatsappSentCount) + delta;

    await tx.organization.update({
      where: { id: organizationId },
      data: {
        whatsappSentMonth: month,
        whatsappSentCount: nextCount,
      },
    });
  });
}

/**
 * After a roster week is published, send the same roster PNG (media template {{1}})
 * to each opted-in staff member — Shift Close image-blast pattern.
 */
export async function sendRosterWhatsappOnPublish(input: {
  organizationId: string;
  rosterWeekId: string;
  rosterWeekPublishAt: Date;
  mediaUrl: string;
  kind?: RosterWhatsappNotifyKind;
}): Promise<RosterWhatsappNotifySummary> {
  const kind = input.kind ?? ROSTER_NOTIFY_KIND_PUBLISH;
  const summary: RosterWhatsappNotifySummary = {
    configured: twilioWhatsappConfigured(),
    enabled: false,
    attempted: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    capReached: false,
    reasons: [],
    mediaUrl: input.mediaUrl,
  };

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: {
      id: true,
      plan: true,
      isDemo: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      suspendedAt: true,
      addonWhatsapp: true,
      messagingWhatsappEnabled: true,
      whatsappSentMonth: true,
      whatsappSentCount: true,
    },
  });
  if (!org) return summary;

  const access = getWhatsappAccess(org);
  summary.enabled = access.enabled;

  if (!access.entitled) {
    summary.reasons.push("not_entitled");
    return summary;
  }
  if (!org.messagingWhatsappEnabled) {
    summary.reasons.push("disabled");
    return summary;
  }

  const twilioConfig = getTwilioWhatsappConfig();
  if (!twilioConfig?.rosterContentSid) {
    summary.reasons.push("not_configured");
    return summary;
  }

  if (access.atCap) {
    summary.capReached = true;
    summary.reasons.push("cap");
    return summary;
  }

  if (!input.mediaUrl.startsWith("https://")) {
    summary.reasons.push("invalid_media");
    return summary;
  }

  const week = await prisma.rosterWeek.findFirst({
    where: { id: input.rosterWeekId, organizationId: input.organizationId, status: "published" },
    select: {
      id: true,
      weekStart: true,
      shareToken: true,
      locationId: true,
      location: { select: { timeZone: true } },
      organization: { select: { timeZone: true } },
      entries: {
        select: { staffId: true, shiftTemplateId: true },
      },
    },
  });
  if (!week?.shareToken) return summary;

  const anchorYmd = ymdForDbDate(week.weekStart);
  const weekEnd = weekEndYmd(anchorYmd);
  const timeZone = week.location.timeZone ?? week.organization.timeZone;
  const todayYmd = formatYmdInZone(new Date(), timeZone);

  const staffRows = await prisma.staff.findMany({
    where: {
      organizationId: input.organizationId,
      locationId: week.locationId,
      archivedAt: null,
      whatsappOptIn: true,
      contactNumber: { not: null },
    },
    select: {
      id: true,
      contactNumber: true,
      startDate: true,
      archivedAt: true,
      excludeFromRoster: true,
    },
  });

  const staffIdsWithEntries = staffIdsWithRosterEntries(week.entries);
  const visibleStaff = filterRosterStaffForWeek(staffRows, {
    weekEndYmd: weekEnd,
    todayYmd,
    staffIdsWithEntries,
  });

  let sentDelta = 0;
  let remaining = access.remaining ?? 0;

  for (const staff of visibleStaff) {
    if (access.monthlyCap !== null && remaining <= 0) {
      summary.capReached = true;
      summary.skipped += 1;
      continue;
    }

    const phone = staff.contactNumber?.trim();
    if (!phone) {
      summary.skipped += 1;
      await logNotification({
        organizationId: input.organizationId,
        rosterWeekId: week.id,
        staffId: staff.id,
        rosterWeekPublishAt: input.rosterWeekPublishAt,
        kind,
        status: "skipped",
        errorMessage: "no_phone",
      });
      continue;
    }

    const to = toWhatsappAddress(phone);
    if (!to) {
      summary.skipped += 1;
      await logNotification({
        organizationId: input.organizationId,
        rosterWeekId: week.id,
        staffId: staff.id,
        rosterWeekPublishAt: input.rosterWeekPublishAt,
        kind,
        status: "skipped",
        errorMessage: "invalid_phone",
      });
      continue;
    }

    const existing = await prisma.rosterNotificationLog.findUnique({
      where: {
        rosterWeekId_staffId_channel_kind_rosterWeekPublishAt: {
          rosterWeekId: week.id,
          staffId: staff.id,
          channel: ROSTER_NOTIFY_CHANNEL_WHATSAPP,
          kind,
          rosterWeekPublishAt: input.rosterWeekPublishAt,
        },
      },
      select: { status: true },
    });
    if (existing?.status === "sent") {
      summary.skipped += 1;
      continue;
    }

    summary.attempted += 1;

    // Media template: static body + media {{1}} = public PNG URL (Shift Close pattern).
    const result = await sendWhatsappTemplate({
      to,
      contentSid: twilioConfig.rosterContentSid,
      contentVariables: {
        "1": input.mediaUrl,
      },
    });

    if (result.ok) {
      summary.sent += 1;
      sentDelta += 1;
      remaining -= 1;
      await logNotification({
        organizationId: input.organizationId,
        rosterWeekId: week.id,
        staffId: staff.id,
        rosterWeekPublishAt: input.rosterWeekPublishAt,
        kind,
        status: "sent",
        externalSid: result.sid,
      });
    } else {
      summary.failed += 1;
      await logNotification({
        organizationId: input.organizationId,
        rosterWeekId: week.id,
        staffId: staff.id,
        rosterWeekPublishAt: input.rosterWeekPublishAt,
        kind,
        status: "failed",
        errorMessage: result.error,
      });
    }
  }

  if (sentDelta > 0) {
    await incrementWhatsappSentCount(input.organizationId, sentDelta);
  }

  return summary;
}

async function logNotification(input: {
  organizationId: string;
  rosterWeekId: string;
  staffId: string;
  rosterWeekPublishAt: Date;
  kind: RosterWhatsappNotifyKind;
  status: string;
  externalSid?: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    await prisma.rosterNotificationLog.upsert({
      where: {
        rosterWeekId_staffId_channel_kind_rosterWeekPublishAt: {
          rosterWeekId: input.rosterWeekId,
          staffId: input.staffId,
          channel: ROSTER_NOTIFY_CHANNEL_WHATSAPP,
          kind: input.kind,
          rosterWeekPublishAt: input.rosterWeekPublishAt,
        },
      },
      create: {
        organizationId: input.organizationId,
        rosterWeekId: input.rosterWeekId,
        staffId: input.staffId,
        channel: ROSTER_NOTIFY_CHANNEL_WHATSAPP,
        kind: input.kind,
        rosterWeekPublishAt: input.rosterWeekPublishAt,
        status: input.status,
        externalSid: input.externalSid ?? null,
        errorMessage: input.errorMessage ?? null,
      },
      update: {
        status: input.status,
        externalSid: input.externalSid ?? null,
        errorMessage: input.errorMessage ?? null,
      },
    });
  } catch (err) {
    console.error("[roster-whatsapp-notify] log failed", err);
  }
}
