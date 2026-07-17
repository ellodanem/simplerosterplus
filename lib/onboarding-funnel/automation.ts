import { Prisma } from "@prisma/client";
import { sendResendEmailDetailed } from "@/lib/email/send";
import {
  isOnboardingAutomationEnabled,
  getMaxFollowUps,
} from "@/lib/onboarding-funnel/eligibility";
import { previewOnboardingFollowUp } from "@/lib/onboarding-funnel/follow-up";
import { detectAndMarkAbandoned } from "@/lib/onboarding-funnel/detect-abandoned";
import { prisma } from "@/lib/prisma";

const HOUR_MS = 60 * 60 * 1000;

export type AutomaticSequenceStep = 1 | 2 | 3;

function positiveHours(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Delay after the sequence anchor: inactivity for step 1, prior send for steps 2/3. */
export function automaticSequenceDelayHours(
  step: AutomaticSequenceStep,
  env: Record<string, string | undefined> = process.env,
): number {
  if (step === 1) {
    return positiveHours(env.ONBOARDING_AUTOMATION_FIRST_HOURS, 24);
  }
  if (step === 2) {
    return positiveHours(env.ONBOARDING_AUTOMATION_SECOND_HOURS, 72);
  }
  return positiveHours(env.ONBOARDING_AUTOMATION_FINAL_HOURS, 120);
}

export function automaticSequenceScheduledFor(args: {
  step: AutomaticSequenceStep;
  lastActivityAt: Date;
  lastFollowUpAt: Date | null;
  env?: Record<string, string | undefined>;
}): Date {
  const anchor =
    args.step === 1
      ? args.lastActivityAt
      : (args.lastFollowUpAt ?? args.lastActivityAt);
  return new Date(
    anchor.getTime() +
      automaticSequenceDelayHours(args.step, args.env) * HOUR_MS,
  );
}

export type AutomationScheduleResult = {
  enabled: boolean;
  scanned: number;
  scheduled: number;
  suppressed: number;
};

/**
 * Create future database-backed sequence rows. Does nothing unless the explicit
 * automation flag is true.
 */
export async function scheduleAutomaticOnboardingFollowUps(opts?: {
  now?: Date;
  limit?: number;
}): Promise<AutomationScheduleResult> {
  if (!isOnboardingAutomationEnabled()) {
    return { enabled: false, scanned: 0, scheduled: 0, suppressed: 0 };
  }

  const maxFollowUps = Math.min(3, getMaxFollowUps());
  const candidates = await prisma.onboardingProgress.findMany({
    where: {
      abandonedAt: { not: null },
      activatedAt: null,
      completedAt: null,
      doNotContact: false,
      needsSupport: false,
      followUpCount: { lt: maxFollowUps },
      followUps: {
        none: { status: { in: ["draft", "scheduled", "sending"] } },
      },
    },
    orderBy: { lastActivityAt: "asc" },
    take: Math.min(200, opts?.limit ?? 100),
    select: {
      id: true,
      userId: true,
      organizationId: true,
      highestStageReached: true,
      lastActivityAt: true,
      lastFollowUpAt: true,
      followUpCount: true,
    },
  });

  let scheduled = 0;
  let suppressed = 0;

  for (const candidate of candidates) {
    const step = (candidate.followUpCount + 1) as AutomaticSequenceStep;

    const preview = await previewOnboardingFollowUp(candidate.id);
    if (!preview.eligible) {
      suppressed += 1;
      continue;
    }

    const scheduledFor = automaticSequenceScheduledFor({
      step,
      lastActivityAt: candidate.lastActivityAt,
      lastFollowUpAt: candidate.lastFollowUpAt,
    });
    const idempotencyKey = `auto:sequence:${candidate.id}:${step}`;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.onboardingFollowUp.create({
          data: {
            userId: candidate.userId,
            organizationId: candidate.organizationId,
            onboardingProgressId: candidate.id,
            channel: "email",
            templateKey: preview.template.templateKey,
            subject: preview.template.subject,
            status: "scheduled",
            scheduledFor,
            initiatedBy: "system:automation",
            idempotencyKey,
          },
        });
        await tx.onboardingProgress.update({
          where: { id: candidate.id },
          data: {
            followUpStatus: "scheduled",
            nextFollowUpAt: scheduledFor,
          },
        });
      });
      scheduled += 1;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }

  return {
    enabled: true,
    scanned: candidates.length,
    scheduled,
    suppressed,
  };
}

export type DueFollowUpResult = {
  scanned: number;
  claimed: number;
  sent: number;
  failed: number;
  suppressed: number;
  skippedAutomationDisabled: number;
};

async function markSuppressed(
  followUpId: string,
  progressId: string,
  reason: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.onboardingFollowUp.update({
      where: { id: followUpId },
      data: {
        status: "suppressed",
        failureReason: reason.slice(0, 500),
      },
    }),
    prisma.onboardingProgress.update({
      where: { id: progressId },
      data: {
        followUpStatus: "suppressed",
        nextFollowUpAt: null,
      },
    }),
  ]);
}

/**
 * Claim and deliver due scheduled rows. Operator-scheduled messages run regardless of
 * automation flag; system sequence rows require ONBOARDING_AUTOMATION_ENABLED=true.
 */
export async function processDueOnboardingFollowUps(opts?: {
  now?: Date;
  limit?: number;
}): Promise<DueFollowUpResult> {
  const now = opts?.now ?? new Date();
  const automationEnabled = isOnboardingAutomationEnabled();
  const due = await prisma.onboardingFollowUp.findMany({
    where: {
      status: "scheduled",
      scheduledFor: { lte: now },
    },
    orderBy: { scheduledFor: "asc" },
    take: Math.min(100, opts?.limit ?? 50),
    select: {
      id: true,
      onboardingProgressId: true,
      templateKey: true,
      initiatedBy: true,
    },
  });

  const result: DueFollowUpResult = {
    scanned: due.length,
    claimed: 0,
    sent: 0,
    failed: 0,
    suppressed: 0,
    skippedAutomationDisabled: 0,
  };

  for (const row of due) {
    if (row.initiatedBy === "system:automation" && !automationEnabled) {
      result.skippedAutomationDisabled += 1;
      continue;
    }

    const claim = await prisma.onboardingFollowUp.updateMany({
      where: { id: row.id, status: "scheduled" },
      data: { status: "sending" },
    });
    if (claim.count !== 1) continue;
    result.claimed += 1;

    try {
      const preview = await previewOnboardingFollowUp(
        row.onboardingProgressId,
        row.templateKey,
      );
      if (!preview.eligible || !preview.to) {
        await markSuppressed(
          row.id,
          row.onboardingProgressId,
          preview.ineligibleReason ?? "not_eligible",
        );
        result.suppressed += 1;
        continue;
      }

      const provider = await sendResendEmailDetailed({
        to: preview.to,
        subject: preview.template.subject,
        text: preview.template.text,
        html: preview.template.html,
        replyTo: process.env.SUPPORT_EMAIL?.trim() || undefined,
        from: process.env.ONBOARDING_FOLLOW_UP_FROM?.trim() || undefined,
      });

      if (!provider.ok) {
        const failureReason =
          provider.reason === "not_configured"
            ? "Resend is not configured."
            : provider.detail || "Email provider rejected the message.";
        await prisma.$transaction([
          prisma.onboardingFollowUp.update({
            where: { id: row.id },
            data: {
              status: "failed",
              failedAt: new Date(),
              failureReason: failureReason.slice(0, 500),
            },
          }),
          prisma.onboardingProgress.update({
            where: { id: row.onboardingProgressId },
            data: { followUpStatus: "failed", nextFollowUpAt: null },
          }),
        ]);
        result.failed += 1;
        continue;
      }

      const sentAt = new Date();
      await prisma.$transaction([
        prisma.onboardingFollowUp.update({
          where: { id: row.id },
          data: {
            status: "sent",
            sentAt,
            providerMessageId: provider.providerMessageId,
          },
        }),
        prisma.onboardingProgress.update({
          where: { id: row.onboardingProgressId },
          data: {
            followUpStatus: "sent",
            followUpCount: { increment: 1 },
            lastFollowUpAt: sentAt,
            nextFollowUpAt: null,
          },
        }),
      ]);
      result.sent += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Scheduled follow-up failed.";
      await prisma.$transaction([
        prisma.onboardingFollowUp.update({
          where: { id: row.id },
          data: {
            status: "failed",
            failedAt: new Date(),
            failureReason: message.slice(0, 500),
          },
        }),
        prisma.onboardingProgress.update({
          where: { id: row.onboardingProgressId },
          data: { followUpStatus: "failed", nextFollowUpAt: null },
        }),
      ]);
      result.failed += 1;
    }
  }

  return result;
}

export async function runOnboardingFollowUpCycle(opts?: {
  now?: Date;
  limit?: number;
}) {
  const abandonment = await detectAndMarkAbandoned({
    now: opts?.now,
    limit: opts?.limit,
  });
  const scheduling = await scheduleAutomaticOnboardingFollowUps(opts);
  const delivery = await processDueOnboardingFollowUps(opts);
  return { abandonment, scheduling, delivery };
}
