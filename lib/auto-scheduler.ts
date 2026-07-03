import { prisma } from "@/lib/prisma";
import { calendarWeekdayIndex, formatYmdInZone, utcDateFromYmd } from "@/lib/datetime-policy";
import { getApprovedBlockMap, type BlockReason } from "@/lib/leave-blocks";
import { staffEligibleForRosterWeek } from "@/lib/roster-display-staff";
import {
  isRosterDayLocked,
  isRosterWeekLocked,
  rosterLockFromShareToken,
  type RosterLockOptions,
} from "@/lib/roster-week-lock";
import { daysOfWeek, weekEndYmd, ymdForDbDate } from "@/lib/roster-week";

export const AUTO_SCHEDULER_NO_PREVIOUS_SHIFTS_WARNING =
  "Previous week has no shifts to copy.";

export type AutoSchedulerMode = "copy_previous" | "fill_open";

export type AutoSchedulerProposal = {
  staffId: string;
  date: string;
  shiftTemplateId: string;
  reason: string;
  position: string | null;
  notes: string | null;
};

export type AutoSchedulerSkipped = {
  staffId: string;
  date: string;
  reason: string;
};

export type AutoSchedulerPreviewResult = {
  mode: AutoSchedulerMode;
  proposals: AutoSchedulerProposal[];
  skipped: AutoSchedulerSkipped[];
  warnings: string[];
};

export type AutoSchedulerApplyResult = {
  applied: number;
  entries: { staffId: string; date: string; shiftTemplateId: string | null }[];
  usageCount: number;
};

const ONE_DAY_MS = 86_400_000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const HISTORY_WEEK_COUNT = 8;

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type StaffRow = {
  id: string;
  firstName: string;
  lastName: string;
  startDate: Date | null;
  archivedAt: Date | null;
  excludeFromRoster: boolean;
};

type HistoryEntry = {
  staffId: string;
  date: Date;
  shiftTemplateId: string;
};

type ShiftPreferenceEngine = {
  resolve(staffId: string, ymd: string): { templateId: string; reason: string } | null;
};

export type AutoSchedulerContext = {
  weekId: string;
  organizationId: string;
  locationId: string;
  anchorYmd: string;
  timeZone: string;
  todayYmd: string;
  rosterLock: RosterLockOptions;
  days: string[];
  staff: StaffRow[];
  staffById: Map<string, StaffRow>;
  blockMap: Record<string, BlockReason>;
  closedDateMs: Set<number>;
  currentEntries: Map<string, string>;
  validTemplateIds: Set<string>;
  defaultTemplateId: string | null;
  preference: ShiftPreferenceEngine;
};

function addDaysUtc(d: Date, days: number): Date {
  return new Date(d.getTime() + days * ONE_DAY_MS);
}

function cellKey(staffId: string, ymd: string): string {
  return `${staffId}__${ymd}`;
}

function weekdayName(ymd: string, timeZone: string): string {
  return WEEKDAY_NAMES[calendarWeekdayIndex(ymd, timeZone)] ?? "day";
}

function modeFromCounts(counts: Map<string, number> | undefined): string | null {
  if (!counts || counts.size === 0) return null;
  let best: string | null = null;
  let bestCount = -1;
  for (const [templateId, count] of counts) {
    if (count > bestCount) {
      best = templateId;
      bestCount = count;
    }
  }
  return best;
}

function buildPreferenceEngine(
  historyByWeek: Array<{ weekStartMs: number; entries: HistoryEntry[] }>,
  targetAnchorYmd: string,
  timeZone: string,
  validTemplateIds: Set<string>,
  defaultTemplateId: string | null,
): ShiftPreferenceEngine {
  const prevWeekStartMs = utcDateFromYmd(targetAnchorYmd).getTime() - SEVEN_DAYS_MS;

  const lastWeekByStaffWeekday = new Map<string, string>();
  const countsByStaffWeekday = new Map<string, Map<string, number>>();
  const countsByStaff = new Map<string, Map<string, number>>();

  for (const week of historyByWeek) {
    const isPrevWeek = week.weekStartMs === prevWeekStartMs;
    for (const e of week.entries) {
      if (!validTemplateIds.has(e.shiftTemplateId)) continue;
      const ymd = ymdForDbDate(e.date);
      const weekday = calendarWeekdayIndex(ymd, timeZone);
      const staffWeekdayKey = `${e.staffId}:${weekday}`;

      if (isPrevWeek) {
        lastWeekByStaffWeekday.set(staffWeekdayKey, e.shiftTemplateId);
      }

      let weekdayMap = countsByStaffWeekday.get(staffWeekdayKey);
      if (!weekdayMap) {
        weekdayMap = new Map();
        countsByStaffWeekday.set(staffWeekdayKey, weekdayMap);
      }
      weekdayMap.set(e.shiftTemplateId, (weekdayMap.get(e.shiftTemplateId) ?? 0) + 1);

      let staffMap = countsByStaff.get(e.staffId);
      if (!staffMap) {
        staffMap = new Map();
        countsByStaff.set(e.staffId, staffMap);
      }
      staffMap.set(e.shiftTemplateId, (staffMap.get(e.shiftTemplateId) ?? 0) + 1);
    }
  }

  return {
    resolve(staffId: string, ymd: string) {
      const weekday = calendarWeekdayIndex(ymd, timeZone);
      const staffWeekdayKey = `${staffId}:${weekday}`;

      const lastWeek = lastWeekByStaffWeekday.get(staffWeekdayKey);
      if (lastWeek) {
        return { templateId: lastWeek, reason: `Same as last ${weekdayName(ymd, timeZone)}` };
      }

      const weekdayMode = modeFromCounts(countsByStaffWeekday.get(staffWeekdayKey));
      if (weekdayMode) {
        return {
          templateId: weekdayMode,
          reason: `Usually works ${weekdayName(ymd, timeZone)}`,
        };
      }

      const staffMode = modeFromCounts(countsByStaff.get(staffId));
      if (staffMode) {
        return { templateId: staffMode, reason: "Most common shift" };
      }

      if (defaultTemplateId) {
        return { templateId: defaultTemplateId, reason: "Default shift" };
      }

      return null;
    },
  };
}

export async function loadAutoSchedulerContext(
  weekId: string,
  organizationId: string,
): Promise<AutoSchedulerContext | null> {
  const week = await prisma.rosterWeek.findFirst({
    where: { id: weekId, organizationId },
    select: {
      id: true,
      weekStart: true,
      shareToken: true,
      organizationId: true,
      locationId: true,
      location: { select: { timeZone: true } },
      organization: { select: { timeZone: true } },
      entries: {
        select: { staffId: true, date: true, shiftTemplateId: true },
      },
    },
  });
  if (!week) return null;

  const anchorYmd = ymdForDbDate(week.weekStart);
  const timeZone = week.location.timeZone ?? week.organization.timeZone;
  const todayYmd = formatYmdInZone(new Date(), timeZone);
  const rosterLock = rosterLockFromShareToken(week.shareToken);
  const weekStartDate = week.weekStart;
  const weekEndDate = addDaysUtc(weekStartDate, 6);
  const days = daysOfWeek(anchorYmd);

  const historyWeekStarts: Date[] = [];
  for (let i = 1; i <= HISTORY_WEEK_COUNT; i++) {
    historyWeekStarts.push(new Date(weekStartDate.getTime() - i * SEVEN_DAYS_MS));
  }

  const [holidays, allStaff, templates, historyWeeks] = await Promise.all([
    prisma.publicHoliday.findMany({
      where: {
        organizationId: week.organizationId,
        locationId: week.locationId,
        stationClosed: true,
        date: { gte: weekStartDate, lte: weekEndDate },
      },
      select: { date: true },
    }),
    prisma.staff.findMany({
      where: { organizationId: week.organizationId, locationId: week.locationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        startDate: true,
        archivedAt: true,
        excludeFromRoster: true,
      },
    }),
    prisma.shiftTemplate.findMany({
      where: { organizationId: week.organizationId },
      orderBy: [{ name: "asc" }],
      select: { id: true },
    }),
    prisma.rosterWeek.findMany({
      where: {
        locationId: week.locationId,
        weekStart: { in: historyWeekStarts },
      },
      select: { id: true, weekStart: true },
    }),
  ]);

  const historyWeekIds = historyWeeks.map((w) => w.id);
  const historyEntriesRaw =
    historyWeekIds.length > 0
      ? await prisma.rosterEntry.findMany({
          where: {
            rosterWeekId: { in: historyWeekIds },
            shiftTemplateId: { not: null },
          },
          select: { rosterWeekId: true, staffId: true, date: true, shiftTemplateId: true },
        })
      : [];

  const historyByWeek = historyWeeks.map((w) => ({
    weekStartMs: w.weekStart.getTime(),
    entries: historyEntriesRaw
      .filter((e) => e.rosterWeekId === w.id && e.shiftTemplateId != null)
      .map((e) => ({
        staffId: e.staffId,
        date: e.date,
        shiftTemplateId: e.shiftTemplateId as string,
      })),
  }));

  const blockMap = await getApprovedBlockMap({
    staffIds: allStaff.map((s) => s.id),
    rangeStartDate: weekStartDate,
    rangeEndDate: weekEndDate,
  });

  const currentEntries = new Map<string, string>();
  for (const e of week.entries) {
    if (e.shiftTemplateId) {
      currentEntries.set(cellKey(e.staffId, ymdForDbDate(e.date)), e.shiftTemplateId);
    }
  }

  const validTemplateIds = new Set(templates.map((t) => t.id));
  const defaultTemplateId = templates[0]?.id ?? null;

  const preference = buildPreferenceEngine(
    historyByWeek,
    anchorYmd,
    timeZone,
    validTemplateIds,
    defaultTemplateId,
  );

  return {
    weekId: week.id,
    organizationId: week.organizationId,
    locationId: week.locationId,
    anchorYmd,
    timeZone,
    todayYmd,
    rosterLock,
    days,
    staff: allStaff,
    staffById: new Map(allStaff.map((s) => [s.id, s])),
    blockMap,
    closedDateMs: new Set(holidays.map((h) => h.date.getTime())),
    currentEntries,
    validTemplateIds,
    defaultTemplateId,
    preference,
  };
}

function assertWeekEditable(ctx: AutoSchedulerContext): string | null {
  if (isRosterWeekLocked(ctx.anchorYmd, ctx.timeZone, ctx.rosterLock)) {
    return "This roster week is locked (read-only).";
  }
  return null;
}

type ProposalBuildArgs = {
  ctx: AutoSchedulerContext;
  staffId: string;
  targetDate: Date;
  targetYmd: string;
  shiftTemplateId: string;
  position: string | null;
  notes: string | null;
  reason: string;
  membershipArgs: {
    weekEndYmd: string;
    todayYmd: string;
    staffIdsWithEntries: Set<string>;
  };
};

function tryBuildProposal(
  args: ProposalBuildArgs,
): { proposal: AutoSchedulerProposal } | { skip: AutoSchedulerSkipped } {
  const { ctx, staffId, targetYmd, targetDate } = args;

  if (isRosterDayLocked(targetYmd, ctx.anchorYmd, ctx.todayYmd, ctx.rosterLock)) {
    return { skip: { staffId, date: targetYmd, reason: "Day is locked" } };
  }

  if (ctx.closedDateMs.has(targetDate.getTime())) {
    return { skip: { staffId, date: targetYmd, reason: "Station closed (holiday)" } };
  }

  const staff = ctx.staffById.get(staffId);
  if (!staff || !staffEligibleForRosterWeek(staff, args.membershipArgs)) {
    return { skip: { staffId, date: targetYmd, reason: "Staff not eligible this week" } };
  }

  if (ctx.blockMap[cellKey(staffId, targetYmd)]) {
    return { skip: { staffId, date: targetYmd, reason: "Approved leave" } };
  }

  if (!ctx.validTemplateIds.has(args.shiftTemplateId)) {
    return { skip: { staffId, date: targetYmd, reason: "Shift template unavailable" } };
  }

  return {
    proposal: {
      staffId,
      date: targetYmd,
      shiftTemplateId: args.shiftTemplateId,
      reason: args.reason,
      position: args.position,
      notes: args.notes,
    },
  };
}

export async function previewAutoScheduler(
  weekId: string,
  organizationId: string,
  mode: AutoSchedulerMode,
): Promise<AutoSchedulerPreviewResult | { error: string; status: number }> {
  const ctx = await loadAutoSchedulerContext(weekId, organizationId);
  if (!ctx) return { error: "Roster week not found", status: 404 };

  const lockError = assertWeekEditable(ctx);
  if (lockError) return { error: lockError, status: 403 };

  const targetWeekEndYmd = weekEndYmd(ctx.anchorYmd);
  const membershipArgs = {
    weekEndYmd: targetWeekEndYmd,
    todayYmd: ctx.todayYmd,
    staffIdsWithEntries: new Set<string>(),
  };

  const proposals: AutoSchedulerProposal[] = [];
  const skipped: AutoSchedulerSkipped[] = [];
  const warnings: string[] = [];

  if (mode === "copy_previous") {
    const prevWeekStart = new Date(utcDateFromYmd(ctx.anchorYmd).getTime() - SEVEN_DAYS_MS);
    const source = await prisma.rosterWeek.findUnique({
      where: {
        locationId_weekStart: {
          locationId: ctx.locationId,
          weekStart: prevWeekStart,
        },
      },
      select: { id: true },
    });

    const sourceEntries = source
      ? await prisma.rosterEntry.findMany({
          where: { rosterWeekId: source.id, shiftTemplateId: { not: null } },
          select: {
            staffId: true,
            date: true,
            shiftTemplateId: true,
            position: true,
            notes: true,
          },
        })
      : [];

    if (sourceEntries.length === 0) {
      warnings.push(AUTO_SCHEDULER_NO_PREVIOUS_SHIFTS_WARNING);
      return { mode, proposals, skipped, warnings };
    }

    for (const e of sourceEntries) {
      if (!e.shiftTemplateId) continue;
      const targetDate = addDaysUtc(e.date, 7);
      const targetYmd = ymdForDbDate(targetDate);
      const result = tryBuildProposal({
        ctx,
        staffId: e.staffId,
        targetDate,
        targetYmd,
        shiftTemplateId: e.shiftTemplateId,
        position: e.position,
        notes: e.notes,
        reason: "Same as last week",
        membershipArgs,
      });
      if ("proposal" in result) proposals.push(result.proposal);
      else skipped.push(result.skip);
    }

    return { mode, proposals, skipped, warnings };
  }

  let hasHistory = false;
  for (const ymd of ctx.days) {
    if (ymd < ctx.todayYmd) continue;
    if (isRosterDayLocked(ymd, ctx.anchorYmd, ctx.todayYmd, ctx.rosterLock)) continue;
    if (ctx.closedDateMs.has(utcDateFromYmd(ymd).getTime())) continue;

    for (const staff of ctx.staff) {
      if (ctx.currentEntries.has(cellKey(staff.id, ymd))) continue;
      if (ctx.blockMap[cellKey(staff.id, ymd)]) continue;
      if (!staffEligibleForRosterWeek(staff, membershipArgs)) continue;

      const pref = ctx.preference.resolve(staff.id, ymd);
      if (!pref) {
        skipped.push({
          staffId: staff.id,
          date: ymd,
          reason: "No shift history to suggest from",
        });
        continue;
      }
      hasHistory = true;

      const targetDate = utcDateFromYmd(ymd);
      const result = tryBuildProposal({
        ctx,
        staffId: staff.id,
        targetDate,
        targetYmd: ymd,
        shiftTemplateId: pref.templateId,
        position: null,
        notes: null,
        reason: pref.reason,
        membershipArgs,
      });
      if ("proposal" in result) proposals.push(result.proposal);
      else skipped.push(result.skip);
    }
  }

  if (!hasHistory && proposals.length === 0) {
    warnings.push(
      "No shift history yet. Build one week manually or use Start from last week when a prior week exists.",
    );
  }

  if (proposals.length === 0 && skipped.length === 0) {
    warnings.push("No open slots to fill from today through week end.");
  }

  return { mode, proposals, skipped, warnings };
}

export async function applyAutoScheduler(
  weekId: string,
  organizationId: string,
  mode: AutoSchedulerMode,
  proposals: AutoSchedulerProposal[],
): Promise<AutoSchedulerApplyResult | { error: string; status: number }> {
  const ctx = await loadAutoSchedulerContext(weekId, organizationId);
  if (!ctx) return { error: "Roster week not found", status: 404 };

  const lockError = assertWeekEditable(ctx);
  if (lockError) return { error: lockError, status: 403 };

  const targetWeekEndYmd = weekEndYmd(ctx.anchorYmd);
  const membershipArgs = {
    weekEndYmd: targetWeekEndYmd,
    todayYmd: ctx.todayYmd,
    staffIdsWithEntries: new Set<string>(),
  };

  const toInsert: {
    staffId: string;
    date: Date;
    shiftTemplateId: string;
    position: string | null;
    notes: string | null;
  }[] = [];

  for (const p of proposals) {
    const targetDate = utcDateFromYmd(p.date);
    const result = tryBuildProposal({
      ctx,
      staffId: p.staffId,
      targetDate,
      targetYmd: p.date,
      shiftTemplateId: p.shiftTemplateId,
      position: p.position,
      notes: p.notes,
      reason: p.reason,
      membershipArgs,
    });
    if (!("proposal" in result)) {
      return {
        error: `Cannot apply: ${result.skip.reason} (${p.date}). Refresh preview and try again.`,
        status: 409,
      };
    }
    if (mode === "fill_open" && ctx.currentEntries.has(cellKey(p.staffId, p.date))) {
      return {
        error: `Cannot apply: cell already assigned (${p.date}). Refresh preview and try again.`,
        status: 409,
      };
    }
    toInsert.push({
      staffId: p.staffId,
      date: targetDate,
      shiftTemplateId: p.shiftTemplateId,
      position: p.position,
      notes: p.notes,
    });
  }

  const unlockedYmds = ctx.days.filter(
    (ymd) => !isRosterDayLocked(ymd, ctx.anchorYmd, ctx.todayYmd, ctx.rosterLock),
  );
  const unlockedDateUtc = unlockedYmds.map((ymd) => utcDateFromYmd(ymd));
  const shouldClearUnlocked = mode === "copy_previous" && unlockedDateUtc.length > 0;

  if (!shouldClearUnlocked && toInsert.length === 0) {
    const allEntries = await prisma.rosterEntry.findMany({
      where: { rosterWeekId: ctx.weekId, shiftTemplateId: { not: null } },
      select: { staffId: true, date: true, shiftTemplateId: true },
    });
    return {
      applied: 0,
      entries: allEntries.map((e) => ({
        staffId: e.staffId,
        date: ymdForDbDate(e.date),
        shiftTemplateId: e.shiftTemplateId,
      })),
      usageCount: await (await import("@/lib/auto-scheduler-usage")).getAutoSchedulerUsageCount(
        ctx.organizationId,
        ctx.timeZone,
      ),
    };
  }

  await prisma.$transaction([
    ...(shouldClearUnlocked
      ? [
          prisma.rosterEntry.deleteMany({
            where: {
              rosterWeekId: ctx.weekId,
              date: { in: unlockedDateUtc },
            },
          }),
        ]
      : []),
    ...(toInsert.length > 0
      ? [
          prisma.rosterEntry.createMany({
            data: toInsert.map((d) => ({ ...d, rosterWeekId: ctx.weekId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  const allEntries = await prisma.rosterEntry.findMany({
    where: { rosterWeekId: ctx.weekId, shiftTemplateId: { not: null } },
    select: { staffId: true, date: true, shiftTemplateId: true },
  });

  const { incrementAutoSchedulerUsage } = await import("@/lib/auto-scheduler-usage");
  const usageCount = await incrementAutoSchedulerUsage(ctx.organizationId, ctx.timeZone);

  return {
    applied: toInsert.length,
    entries: allEntries.map((e) => ({
      staffId: e.staffId,
      date: ymdForDbDate(e.date),
      shiftTemplateId: e.shiftTemplateId,
    })),
    usageCount,
  };
}
