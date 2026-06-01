import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { getApprovedBlockMap } from "./leave-blocks";
import {
  filterRosterStaffForWeek,
  staffIdsWithRosterEntries,
} from "./roster-display-staff";
import { summarizeOpenShiftsFromToday, summarizeOpenShiftsFullWeek } from "./roster-coverage";
import { formatYmdInZone } from "./datetime-policy";
import { daysOfWeek, weekEndYmd, ymdForDbDate } from "./roster-week";

export const ROSTER_SHARE_PATH_PREFIX = "/share/roster";

export function newRosterShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export function rosterSharePath(token: string): string {
  return `${ROSTER_SHARE_PATH_PREFIX}/${token}`;
}

export function rosterShareUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${rosterSharePath(token)}`;
}

export type RosterWeekCoverageGaps = {
  openShiftCount: number;
  openShiftDayYmd: string | null;
  openShiftDayLabel: string | null;
};

/** Coverage gaps for a roster week (org-scoped caller must verify access). */
export async function getRosterWeekCoverageGaps(weekId: string): Promise<RosterWeekCoverageGaps | null> {
  const week = await prisma.rosterWeek.findUnique({
    where: { id: weekId },
    select: {
      organizationId: true,
      locationId: true,
      weekStart: true,
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
  const weekEnd = weekEndYmd(anchorYmd);
  const days = daysOfWeek(anchorYmd);
  const todayYmd = formatYmdInZone(new Date(), timeZone);
  const weekEndDate = new Date(week.weekStart.getTime() + 6 * 86_400_000);

  const staffRows = await prisma.staff.findMany({
    where: {
      organizationId: week.organizationId,
      locationId: week.locationId,
    },
    select: {
      id: true,
      startDate: true,
      archivedAt: true,
      excludeFromRoster: true,
    },
  });

  const holidays = await prisma.publicHoliday.findMany({
    where: {
      organizationId: week.organizationId,
      locationId: week.locationId,
      date: { gte: week.weekStart, lte: weekEndDate },
    },
    select: { date: true, stationClosed: true },
  });

  const staffIdsWithEntries = staffIdsWithRosterEntries(week.entries);
  const visibleStaff = filterRosterStaffForWeek(staffRows, {
    weekEndYmd: weekEnd,
    todayYmd,
    staffIdsWithEntries,
  });

  const entries: Record<string, string> = {};
  for (const e of week.entries) {
    if (e.shiftTemplateId) {
      entries[`${e.staffId}__${ymdForDbDate(e.date)}`] = e.shiftTemplateId;
    }
  }

  const blockMap = await getApprovedBlockMap({
    staffIds: visibleStaff.map((s) => s.id),
    rangeStartDate: week.weekStart,
    rangeEndDate: weekEndDate,
  });

  const closedDays = new Set<string>();
  for (const h of holidays) {
    if (h.stationClosed) closedDays.add(ymdForDbDate(h.date));
  }

  const summary =
    weekEnd < todayYmd
      ? summarizeOpenShiftsFullWeek({
          days,
          staff: visibleStaff,
          entries,
          blockMap,
          closedDays,
          timeZone,
        })
      : summarizeOpenShiftsFromToday({
          days,
          todayYmd,
          staff: visibleStaff,
          entries,
          blockMap,
          closedDays,
          timeZone,
        });

  return summary;
}
