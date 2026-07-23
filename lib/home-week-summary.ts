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
  computeCoverageRangeLabel,
  offCountForDay,
  summarizeOpenShiftsFromToday,
} from "./roster-coverage";
import {
  buildHomeTodayShift,
  type HomeTodayShift,
} from "./home-today-shift";
import {
  currentWeekStartYmd,
  dayHeaderLabel,
  daysOfWeek,
  shiftYmd,
  weekEndYmd,
  ymdForDbDate,
} from "./roster-week";

export const HOME_PREVIEW_STAFF_LIMIT = 8;

export type HomeRosterPreview = {
  days: string[];
  staff: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: string | null;
  }>;
  totalStaffCount: number;
  templates: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    color: string | null;
  }>;
  entries: Record<string, string>;
  holidays: Record<string, { name: string; stationClosed: boolean }>;
  blockMap: Record<string, "vacation" | "sickLeave" | "dayOff">;
};

export type HomeWeekSummary = {
  orgName: string;
  locationName: string;
  timeZone: string;
  weekStartYmd: string;
  weekEndYmd: string;
  weekRangeLabel: string;
  weekStartBadgeLabel: string;
  prevWeekYmd: string;
  nextWeekYmd: string;
  thisWeekYmd: string;
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
  rosterStatus: "draft" | "published" | null;
  rosterShareToken: string | null;
  rosterPreview: HomeRosterPreview | null;
  todayShift: HomeTodayShift;
};

type RosterStaffRow = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
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
  const thisWeekYmd = currentWeekStartYmd(timeZone, weekStartWeekday);
  const weekEnd = weekEndYmd(weekStartYmd);
  const days = daysOfWeek(weekStartYmd);
  const todayYmd = formatYmdInZone(new Date(), timeZone);
  const weekStartDate = utcDateFromYmd(weekStartYmd);
  const weekEndDate = utcDateFromYmd(weekEnd);

  const [
    attendance,
    rosterWeek,
    staffRows,
    holidays,
    templates,
    pendingVacation,
    pendingDayOff,
    pendingSickLeave,
    pendingShift,
  ] = await Promise.all([
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
          status: true,
          shareToken: true,
          entries: {
            select: { staffId: true, date: true, shiftTemplateId: true },
          },
        },
      }),
      prisma.staff.findMany({
        where: { organizationId, locationId: location.id },
        orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
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
        select: { date: true, name: true, stationClosed: true },
      }),
      prisma.shiftTemplate.findMany({
        where: { organizationId },
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          startTime: true,
          endTime: true,
          color: true,
        },
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
      prisma.staffSickLeave.count({
        where: {
          status: "requested",
          staff: { organizationId, locationId: location.id },
        },
      }),
      prisma.staffShiftRequest.count({
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

  const holidayMap: Record<string, { name: string; stationClosed: boolean }> = {};
  const closedDays = new Set<string>();
  for (const h of holidays) {
    const ymd = ymdForDbDate(h.date);
    holidayMap[ymd] = { name: h.name, stationClosed: h.stationClosed };
    if (h.stationClosed) closedDays.add(ymd);
  }

  const offByDay = new Map<string, number>();
  for (const ymd of days) {
    if (ymd < todayYmd) continue;
    offByDay.set(
      ymd,
      offCountForDay({
        staff: visibleStaff,
        entries,
        blockMap,
        stationClosed: closedDays.has(ymd),
        ymd,
      }),
    );
  }

  const openShiftSummary = summarizeOpenShiftsFromToday({
    days,
    todayYmd,
    staff: visibleStaff,
    entries,
    blockMap,
    closedDays,
    timeZone,
  });

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

  const rosterPreviewStaff = visibleStaff.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    role: s.role,
  }));

  const rosterPreview: HomeRosterPreview | null =
    rosterPreviewStaff.length > 0
      ? {
          days,
          staff: rosterPreviewStaff,
          totalStaffCount: rosterPreviewStaff.length,
          templates,
          entries,
          holidays: holidayMap,
          blockMap,
        }
      : null;

  const weekStartBadge = dayHeaderLabel(weekStartYmd, timeZone);

  const todayShift = buildHomeTodayShift({
    attendance,
    todayYmd,
    timeZone,
  });

  return {
    orgName: org.name,
    locationName: location.name,
    timeZone,
    weekStartYmd,
    weekEndYmd: weekEnd,
    weekRangeLabel: formatWeekRangeLabel(weekStartYmd, weekEnd, timeZone),
    weekStartBadgeLabel: `${weekStartBadge.date}`,
    prevWeekYmd: shiftYmd(weekStartYmd, -7),
    nextWeekYmd: shiftYmd(weekStartYmd, 7),
    thisWeekYmd,
    todayYmd,
    graceMinutes: attendance.graceMinutes,
    lateCount,
    absentCount,
    openShiftCount: openShiftSummary.openShiftCount,
    openShiftDayYmd: openShiftSummary.openShiftDayYmd,
    openShiftDayLabel: openShiftSummary.openShiftDayLabel,
    coverageRangeLabel,
    pendingRequestsCount: pendingVacation + pendingDayOff + pendingSickLeave + pendingShift,
    rosterStatus: rosterWeek?.status ?? null,
    rosterShareToken:
      rosterWeek?.status === "published" && rosterWeek.shareToken
        ? rosterWeek.shareToken
        : null,
    rosterPreview,
    todayShift,
  };
}
