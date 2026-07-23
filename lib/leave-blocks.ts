import { prisma } from "./prisma";
import { ymdForDbDate } from "./roster-week";

export type BlockReason = "vacation" | "sickLeave" | "dayOff";

/**
 * Map of `${staffId}__${ymd}` -> reason for any approved leave that should block roster cells
 * in `[rangeStartDate, rangeEndDate]` (inclusive, both `@db.Date` UTC midnights). Precedence
 * when multiple leave types land on the same day: vacation > sickLeave > dayOff.
 *
 * Pass `staffIds` to limit the query to the staff actually on screen — usually the location's
 * roster — so we don't load leave for unrelated staff.
 */
export async function getApprovedBlockMap(args: {
  staffIds: string[];
  rangeStartDate: Date;
  rangeEndDate: Date;
}): Promise<Record<string, BlockReason>> {
  const { staffIds, rangeStartDate, rangeEndDate } = args;
  if (staffIds.length === 0) return {};

  const [vacations, sickLeaves, daysOff] = await Promise.all([
    prisma.staffVacation.findMany({
      where: {
        staffId: { in: staffIds },
        status: "approved",
        startDate: { lte: rangeEndDate },
        endDate: { gte: rangeStartDate },
      },
      select: { staffId: true, startDate: true, endDate: true },
    }),
    prisma.staffSickLeave.findMany({
      where: {
        staffId: { in: staffIds },
        status: "approved",
        startDate: { lte: rangeEndDate },
        endDate: { gte: rangeStartDate },
      },
      select: { staffId: true, startDate: true, endDate: true },
    }),
    prisma.staffDayOff.findMany({
      where: {
        staffId: { in: staffIds },
        status: "approved",
        date: { gte: rangeStartDate, lte: rangeEndDate },
      },
      select: { staffId: true, date: true },
    }),
  ]);

  const result: Record<string, BlockReason> = {};

  for (const d of daysOff) {
    result[`${d.staffId}__${ymdForDbDate(d.date)}`] = "dayOff";
  }

  for (const s of sickLeaves) {
    const start = s.startDate < rangeStartDate ? rangeStartDate : s.startDate;
    const end = s.endDate > rangeEndDate ? rangeEndDate : s.endDate;
    for (
      let t = start.getTime();
      t <= end.getTime();
      t += 24 * 60 * 60 * 1000
    ) {
      const ymd = ymdForDbDate(new Date(t));
      result[`${s.staffId}__${ymd}`] = "sickLeave";
    }
  }

  for (const v of vacations) {
    const start = v.startDate < rangeStartDate ? rangeStartDate : v.startDate;
    const end = v.endDate > rangeEndDate ? rangeEndDate : v.endDate;
    for (
      let t = start.getTime();
      t <= end.getTime();
      t += 24 * 60 * 60 * 1000
    ) {
      const ymd = ymdForDbDate(new Date(t));
      result[`${v.staffId}__${ymd}`] = "vacation";
    }
  }

  return result;
}

/**
 * Returns true when a single `(staffId, dateUtc)` is inside any approved vacation,
 * sick-leave, or day-off block. Used by per-cell write APIs (PUT /entries, copy-previous)
 * where building a full map would be wasteful.
 */
export async function isApprovedBlocked(
  staffId: string,
  dateUtc: Date,
): Promise<BlockReason | null> {
  const [vac, sick, off] = await Promise.all([
    prisma.staffVacation.findFirst({
      where: {
        staffId,
        status: "approved",
        startDate: { lte: dateUtc },
        endDate: { gte: dateUtc },
      },
      select: { id: true },
    }),
    prisma.staffSickLeave.findFirst({
      where: {
        staffId,
        status: "approved",
        startDate: { lte: dateUtc },
        endDate: { gte: dateUtc },
      },
      select: { id: true },
    }),
    prisma.staffDayOff.findFirst({
      where: { staffId, status: "approved", date: dateUtc },
      select: { id: true },
    }),
  ]);
  if (vac) return "vacation";
  if (sick) return "sickLeave";
  if (off) return "dayOff";
  return null;
}

/**
 * User-facing 409 message when a roster write would assign a shift onto approved leave.
 * `dateLabel` is typically `"this date"` (single-cell PUT) or a `YYYY-MM-DD` (batch).
 */
export function leaveAssignmentConflictMessage(
  block: BlockReason,
  staffDisplayName: string,
  dateLabel: string,
): string {
  switch (block) {
    case "vacation":
      return `${staffDisplayName} is on vacation on ${dateLabel}.`;
    case "sickLeave":
      return `${staffDisplayName} is on sick leave on ${dateLabel}.`;
    case "dayOff":
      return `${staffDisplayName} has an approved day off on ${dateLabel}.`;
  }
}

export type ShiftPreferenceCue = {
  status: "requested" | "approved";
  shiftTemplateId: string;
  shiftName: string;
};

/**
 * Soft shift preferences for the roster grid (`${staffId}__${ymd}` → cue). Includes pending
 * (`requested`) and approved preferences; deny is omitted. When several templates are asked
 * for the same day, an approved row wins over pending, then earlier name wins.
 */
export async function getShiftPreferenceMap(args: {
  staffIds: string[];
  rangeStartDate: Date;
  rangeEndDate: Date;
}): Promise<Record<string, ShiftPreferenceCue>> {
  const { staffIds, rangeStartDate, rangeEndDate } = args;
  if (staffIds.length === 0) return {};

  const rows = await prisma.staffShiftRequest.findMany({
    where: {
      staffId: { in: staffIds },
      status: { in: ["requested", "approved"] },
      date: { gte: rangeStartDate, lte: rangeEndDate },
    },
    select: {
      staffId: true,
      date: true,
      status: true,
      shiftTemplateId: true,
      shiftTemplate: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { shiftTemplate: { name: "asc" } }],
  });

  const result: Record<string, ShiftPreferenceCue> = {};
  for (const row of rows) {
    if (row.status !== "requested" && row.status !== "approved") continue;
    const key = `${row.staffId}__${ymdForDbDate(row.date)}`;
    const cue: ShiftPreferenceCue = {
      status: row.status,
      shiftTemplateId: row.shiftTemplateId,
      shiftName: row.shiftTemplate.name,
    };
    const existing = result[key];
    if (!existing) {
      result[key] = cue;
      continue;
    }
    if (existing.status === "requested" && cue.status === "approved") {
      result[key] = cue;
    }
  }
  return result;
}
