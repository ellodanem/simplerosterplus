/**
 * Roster coverage gaps (unassigned slots) — shared by Home and publish flow.
 */

import { dayHeaderLabel } from "./roster-week";

export type RosterCoverageStaffRow = {
  id: string;
};

export function offCountForDay(args: {
  staff: RosterCoverageStaffRow[];
  entries: Record<string, string>;
  blockMap: Record<string, "vacation" | "dayOff">;
  stationClosed: boolean;
  ymd: string;
}): number {
  if (args.stationClosed) return 0;
  let unavailable = 0;
  let assigned = 0;
  for (const s of args.staff) {
    if (args.blockMap[`${s.id}__${args.ymd}`]) {
      unavailable++;
      continue;
    }
    if (args.entries[`${s.id}__${args.ymd}`]) assigned++;
  }
  const active = args.staff.length - unavailable;
  return Math.max(0, active - assigned);
}

export type OpenShiftSummary = {
  openShiftCount: number;
  openShiftDayYmd: string | null;
  openShiftDayLabel: string | null;
};

/** Unassigned slots from todayYmd through week end (matches Home dashboard). */
export function summarizeOpenShiftsFromToday(args: {
  days: string[];
  todayYmd: string;
  staff: RosterCoverageStaffRow[];
  entries: Record<string, string>;
  blockMap: Record<string, "vacation" | "dayOff">;
  closedDays: Set<string>;
  timeZone: string;
}): OpenShiftSummary {
  let openShiftCount = 0;
  let openShiftDayYmd: string | null = null;
  let openShiftDayMax = 0;

  for (const ymd of args.days) {
    if (ymd < args.todayYmd) continue;
    const off = offCountForDay({
      staff: args.staff,
      entries: args.entries,
      blockMap: args.blockMap,
      stationClosed: args.closedDays.has(ymd),
      ymd,
    });
    openShiftCount += off;
    if (off > openShiftDayMax) {
      openShiftDayMax = off;
      openShiftDayYmd = ymd;
    }
  }

  return {
    openShiftCount,
    openShiftDayYmd: openShiftDayMax > 0 ? openShiftDayYmd : null,
    openShiftDayLabel:
      openShiftDayMax > 0 && openShiftDayYmd
        ? dayHeaderLabel(openShiftDayYmd, args.timeZone).weekday
        : null,
  };
}

/** Open slots across the full week (for publish-time warning when viewing past weeks). */
export function summarizeOpenShiftsFullWeek(args: {
  days: string[];
  staff: RosterCoverageStaffRow[];
  entries: Record<string, string>;
  blockMap: Record<string, "vacation" | "dayOff">;
  closedDays: Set<string>;
  timeZone: string;
}): OpenShiftSummary {
  let openShiftCount = 0;
  let openShiftDayYmd: string | null = null;
  let openShiftDayMax = 0;

  for (const ymd of args.days) {
    const off = offCountForDay({
      staff: args.staff,
      entries: args.entries,
      blockMap: args.blockMap,
      stationClosed: args.closedDays.has(ymd),
      ymd,
    });
    openShiftCount += off;
    if (off > openShiftDayMax) {
      openShiftDayMax = off;
      openShiftDayYmd = ymd;
    }
  }

  return {
    openShiftCount,
    openShiftDayYmd: openShiftDayMax > 0 ? openShiftDayYmd : null,
    openShiftDayLabel:
      openShiftDayMax > 0 && openShiftDayYmd
        ? dayHeaderLabel(openShiftDayYmd, args.timeZone).weekday
        : null,
  };
}

/** Longest contiguous run of days (ymd >= today) with zero open slots and station open. */
export function computeCoverageRangeLabel(args: {
  days: string[];
  todayYmd: string;
  offByDay: Map<string, number>;
  closedDays: Set<string>;
  timeZone: string;
}): string | null {
  const segments: string[][] = [];
  let current: string[] = [];

  for (const ymd of args.days) {
    if (ymd < args.todayYmd) continue;
    if (args.closedDays.has(ymd)) {
      if (current.length) {
        segments.push(current);
        current = [];
      }
      continue;
    }
    if ((args.offByDay.get(ymd) ?? 0) === 0) {
      current.push(ymd);
    } else if (current.length) {
      segments.push(current);
      current = [];
    }
  }
  if (current.length) segments.push(current);

  if (segments.length === 0) return null;
  const best = segments.reduce((a, b) => (b.length > a.length ? b : a));
  if (best.length === 0) return null;

  const fmt = (ymd: string) => dayHeaderLabel(ymd, args.timeZone).weekday;
  if (best.length === 1) return fmt(best[0]!);
  return `${fmt(best[0]!)}–${fmt(best[best.length - 1]!)}`;
}
