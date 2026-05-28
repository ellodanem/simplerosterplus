/**
 * Single bootstrap for the authenticated Home dashboard: attendance exceptions,
 * roster gaps (unassigned slots), coverage range, and pending requests.
 */

import { prisma } from "./prisma";
import { getAttendanceWeekData } from "./attendance-week";
import { formatYmdInZone, utcDateFromYmd } from "./datetime-policy";
import { getApprovedBlockMap } from "./leave-blocks";
import { getDefaultLocation } from "./location";
import {
  filterRosterStaffForWeek,
  staffIdsWithRosterEntries,
} from "./roster-display-staff";
import { getRosterWeekStartWeekday } from "./roster-week-settings";
import {
  currentWeekStartYmd,
  dayHeaderLabel,
  daysOfWeek,
  weekEndYmd,
  ymdForDbDate,
} from "./roster-week";

export type HomeWeekSummary = {
  orgName: string;
  locationName: string;
  timeZone: string;
  weekStartYmd: string;
  weekEndYmd: string;
  weekRangeLabel: string;
  todayYmd: string;
  graceMinutes: number;
  lateCount: number;
  absentCount: number;
  openShiftCount: number;
  /** Day with the most unassigned slots from today through week end. */
  openShiftDayYmd: string | null;
  openShiftDayLabel: string | null;
  coverageRangeLabel: string | null;
  pendingRequestsCount: number;
};

type RosterStaffRow = {
  id: string;
  startDate: Date | null;
  archivedAt: Date | null;
  excludeFromRoster: boolean;
};

function greetingNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) return "there";
  const piece = local.split(/[.+_-]/)[0] ?? local;
  if (!piece) return "there";
  return piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase();
}

export function homeGreetingName(email: string): string {
  return greetingNameFromEmail(email);
}

function formatWeekRangeLabel(
  weekStartYmd: string,
  weekEnd: string,
  timeZone: string,
): string {
  const start = dayHeaderLabel(weekStartYmd, timeZone);
  const end = dayHeaderLabel(weekEnd, timeZone);
  return `${start.weekday} ${start.date} – ${end.weekday} ${end.date}`;
}

function offCountForDay(args: {
  staff: RosterStaffRow[];
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

/** Longest contiguous run of days (ymd >= today) with zero open slots and station open. */
function computeCoverageRangeLabel(args: {
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

export async function getHomeWeekSummary(organizationId: string): Promise<HomeWeekSummary> {
  const [org, location, weekStartWeekday] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, timeZone: true },
    }),
    getDefaultLocation(organizationId),
    getRosterWeekStartWeekday(organizationId),
  ]);
  if (!org) throw new Error("Organization not found");

  const timeZone = location.timeZone ?? org.timeZone;
  const weekStartYmd = currentWeekStartYmd(timeZone, weekStartWeekday);
  const weekEnd = weekEndYmd(weekStartYmd);
  const days = daysOfWeek(weekStartYmd);
  const todayYmd = formatYmdInZone(new Date(), timeZone);
  const weekStartDate = utcDateFromYmd(weekStartYmd);
  const weekEndDate = utcDateFromYmd(weekEnd);

  const [attendance, rosterWeek, staffRows, holidays, pendingVacation, pendingDayOff] =
    await Promise.all([
      getAttendanceWeekData({
        organizationId,
        locationId: location.id,
        weekStartYmd,
        timeZone,
      }),
      prisma.rosterWeek.findUnique({
        where: {
          locationId_weekStart: { locationId: location.id, weekStart: weekStartDate },
        },
        select: {
          id: true,
          entries: {
            select: { staffId: true, date: true, shiftTemplateId: true },
          },
        },
      }),
      prisma.staff.findMany({
        where: { organizationId, locationId: location.id },
        select: {
          id: true,
          startDate: true,
          archivedAt: true,
          excludeFromRoster: true,
        },
      }),
      prisma.publicHoliday.findMany({
        where: {
          organizationId,
          locationId: location.id,
          date: { gte: weekStartDate, lte: weekEndDate },
        },
        select: { date: true, stationClosed: true },
      }),
      prisma.staffVacation.count({
        where: {
          status: "requested",
          staff: { organizationId, locationId: location.id },
        },
      }),
      prisma.staffDayOff.count({
        where: {
          status: "requested",
          staff: { organizationId, locationId: location.id },
        },
      }),
    ]);

  let lateCount = 0;
  let absentCount = 0;
  for (const cell of Object.values(attendance.cells)) {
    if (cell.ymd > todayYmd) continue;
    if (cell.status === "late") lateCount += 1;
    if (cell.status === "absent") absentCount += 1;
  }

  const staffIdsWithEntries = staffIdsWithRosterEntries(
    rosterWeek?.entries ?? [],
  );
  const visibleStaff = filterRosterStaffForWeek(staffRows, {
    weekEndYmd: weekEnd,
    todayYmd,
    staffIdsWithEntries,
  });

  const entries: Record<string, string> = {};
  for (const e of rosterWeek?.entries ?? []) {
    if (e.shiftTemplateId) {
      entries[`${e.staffId}__${ymdForDbDate(e.date)}`] = e.shiftTemplateId;
    }
  }

  const blockMap = await getApprovedBlockMap({
    staffIds: visibleStaff.map((s) => s.id),
    rangeStartDate: weekStartDate,
    rangeEndDate: weekEndDate,
  });

  const closedDays = new Set<string>();
  for (const h of holidays) {
    if (h.stationClosed) closedDays.add(ymdForDbDate(h.date));
  }

  const offByDay = new Map<string, number>();
  let openShiftCount = 0;
  let openShiftDayYmd: string | null = null;
  let openShiftDayMax = 0;

  for (const ymd of days) {
    if (ymd < todayYmd) continue;
    const off = offCountForDay({
      staff: visibleStaff,
      entries,
      blockMap,
      stationClosed: closedDays.has(ymd),
      ymd,
    });
    offByDay.set(ymd, off);
    openShiftCount += off;
    if (off > openShiftDayMax) {
      openShiftDayMax = off;
      openShiftDayYmd = ymd;
    }
  }

  const coverageRangeLabel =
    visibleStaff.length > 0
      ? computeCoverageRangeLabel({
          days,
          todayYmd,
          offByDay,
          closedDays,
          timeZone,
        })
      : null;

  return {
    orgName: org.name,
    locationName: location.name,
    timeZone,
    weekStartYmd,
    weekEndYmd: weekEnd,
    weekRangeLabel: formatWeekRangeLabel(weekStartYmd, weekEnd, timeZone),
    todayYmd,
    graceMinutes: attendance.graceMinutes,
    lateCount,
    absentCount,
    openShiftCount,
    openShiftDayYmd: openShiftDayMax > 0 ? openShiftDayYmd : null,
    openShiftDayLabel:
      openShiftDayMax > 0 && openShiftDayYmd
        ? dayHeaderLabel(openShiftDayYmd, timeZone).weekday
        : null,
    coverageRangeLabel,
    pendingRequestsCount: pendingVacation + pendingDayOff,
  };
}
