import { prisma } from "./prisma";
import { getApprovedBlockMap } from "./leave-blocks";
import {
  filterRosterStaffForWeek,
  staffIdsWithRosterEntries,
} from "./roster-display-staff";
import { formatYmdInZone } from "./datetime-policy";
import { daysOfWeek, weekEndYmd, ymdForDbDate } from "./roster-week";

export type RosterShareViewData = {
  orgName: string;
  locationName: string;
  timeZone: string;
  weekStartYmd: string;
  weekEndYmd: string;
  days: string[];
  staff: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: string | null;
  }>;
  templates: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    color: string | null;
  }>;
  entries: Record<string, string>;
  holidays: Record<string, { name: string; stationClosed: boolean }>;
  blockMap: Record<string, "vacation" | "dayOff">;
};

/** Load published roster for a share token. Returns null if missing, draft, or invalid. */
export async function getRosterShareViewByToken(
  token: string,
): Promise<RosterShareViewData | null> {
  const week = await prisma.rosterWeek.findFirst({
    where: { shareToken: token, status: "published" },
    select: {
      organizationId: true,
      locationId: true,
      weekStart: true,
      organization: { select: { name: true, timeZone: true } },
      location: { select: { name: true, timeZone: true } },
      entries: {
        select: { staffId: true, date: true, shiftTemplateId: true },
      },
    },
  });
  if (!week) return null;

  const timeZone = week.location.timeZone ?? week.organization.timeZone;
  const weekStartYmd = ymdForDbDate(week.weekStart);
  const weekEnd = weekEndYmd(weekStartYmd);
  const days = daysOfWeek(weekStartYmd);
  const todayYmd = formatYmdInZone(new Date(), timeZone);
  const weekEndDate = new Date(week.weekStart.getTime() + 6 * 86_400_000);

  const [staffRows, templates, holidays] = await Promise.all([
    prisma.staff.findMany({
      where: { organizationId: week.organizationId, locationId: week.locationId },
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
    prisma.shiftTemplate.findMany({
      where: { organizationId: week.organizationId },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        color: true,
      },
    }),
    prisma.publicHoliday.findMany({
      where: {
        organizationId: week.organizationId,
        locationId: week.locationId,
        date: { gte: week.weekStart, lte: weekEndDate },
      },
      select: { date: true, name: true, stationClosed: true },
    }),
  ]);

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

  const holidayMap: Record<string, { name: string; stationClosed: boolean }> = {};
  for (const h of holidays) {
    holidayMap[ymdForDbDate(h.date)] = { name: h.name, stationClosed: h.stationClosed };
  }

  return {
    orgName: week.organization.name,
    locationName: week.location.name,
    timeZone,
    weekStartYmd,
    weekEndYmd: weekEnd,
    days,
    staff: visibleStaff.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      role: s.role,
    })),
    templates,
    entries,
    holidays: holidayMap,
    blockMap,
  };
}
