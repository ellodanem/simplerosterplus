import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getDefaultLocation } from "@/lib/location";
import { getApprovedBlockMap } from "@/lib/leave-blocks";
import {
  filterRosterStaffForWeek,
  staffIdsWithRosterEntries,
} from "@/lib/roster-display-staff";
import { isRosterWeekLocked } from "@/lib/roster-week-lock";
import { formatYmdInZone, utcDateFromYmd } from "@/lib/datetime-policy";
import {
  getHolidaySyncYears,
  listHolidayCountries,
  listHolidaySubdivisions,
} from "@/lib/holiday-calendar";
import { getRosterWeekStartWeekday } from "@/lib/roster-week-settings";
import { getOvertimeSettings } from "@/lib/overtime-settings";
import { redirectToSetupIfIncomplete } from "@/lib/setup-guard";
import {
  currentWeekStartYmd,
  daysOfWeek,
  shiftYmd,
  weekEndYmd,
  weekStartFromYmd,
  ymdForDbDate,
} from "@/lib/roster-week";
import { RosterGrid } from "./roster-grid";

export const metadata = {
  title: "Roster | Simple Roster Plus",
};

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

type SearchParams = { week?: string; requests?: string };

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await redirectToSetupIfIncomplete({ organizationId: session.orgId, nextPath: "/roster" });

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { id: true, name: true, timeZone: true },
  });
  if (!org) redirect("/login");

  const [location, weekStartWeekday, overtimeSettings] = await Promise.all([
    getDefaultLocation(org.id),
    getRosterWeekStartWeekday(org.id),
    getOvertimeSettings(org.id),
  ]);
  const effectiveTimeZone = location.timeZone ?? org.timeZone;
  const holidayCountries = listHolidayCountries();
  const holidaySubdivisions = location.holidayCountryCode
    ? listHolidaySubdivisions(location.holidayCountryCode)
    : [];

  const params = await searchParams;
  const requestedWeek = params.week && YMD_RE.test(params.week) ? params.week : null;
  const openRequests =
    params.requests === "open" || params.requests === "1" || params.requests === "true";
  const weekStartYmd = requestedWeek
    ? weekStartFromYmd(requestedWeek, effectiveTimeZone, weekStartWeekday)
    : currentWeekStartYmd(effectiveTimeZone, weekStartWeekday);

  const weekEndYmdStr = weekEndYmd(weekStartYmd);
  const weekStartDate = utcDateFromYmd(weekStartYmd);
  const weekEndDate = utcDateFromYmd(weekEndYmdStr);
  const days = daysOfWeek(weekStartYmd);
  const todayYmd = formatYmdInZone(new Date(), effectiveTimeZone);
  const weekLocked = isRosterWeekLocked(weekStartYmd, effectiveTimeZone);

  const week = await prisma.rosterWeek.upsert({
    where: {
      locationId_weekStart: {
        locationId: location.id,
        weekStart: weekStartDate,
      },
    },
    create: {
      organizationId: org.id,
      locationId: location.id,
      weekStart: weekStartDate,
      status: "draft",
    },
    update: {},
    select: { id: true, weekStart: true, status: true, notes: true },
  });

  const prevWeekStartYmd = shiftYmd(weekStartYmd, -7);
  const prevWeekStartDate = utcDateFromYmd(prevWeekStartYmd);

  const [staffRows, templates, entries, holidays, pendingCounts, previousWeekRow] =
    await Promise.all([
    prisma.staff.findMany({
      where: { organizationId: org.id, locationId: location.id },
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
      where: { organizationId: org.id },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        unpaidBreakMinutes: true,
        color: true,
      },
    }),
    prisma.rosterEntry.findMany({
      where: { rosterWeekId: week.id },
      select: { staffId: true, date: true, shiftTemplateId: true },
    }),
    prisma.publicHoliday.findMany({
      where: {
        organizationId: org.id,
        locationId: location.id,
        date: { gte: weekStartDate, lte: weekEndDate },
      },
      select: { date: true, name: true, stationClosed: true },
    }),
    Promise.all([
      prisma.staffVacation.count({
        where: {
          status: "requested",
          staff: { organizationId: org.id, locationId: location.id },
        },
      }),
      prisma.staffDayOff.count({
        where: {
          status: "requested",
          staff: { organizationId: org.id, locationId: location.id },
        },
      }),
    ]),
    prisma.rosterWeek.findUnique({
      where: {
        locationId_weekStart: {
          locationId: location.id,
          weekStart: prevWeekStartDate,
        },
      },
      select: {
        entries: {
          select: { staffId: true, date: true, shiftTemplateId: true },
        },
      },
    }),
  ]);

  const staffIdsWithEntries = staffIdsWithRosterEntries(entries);
  const visibleStaff = filterRosterStaffForWeek(staffRows, {
    weekEndYmd: weekEndYmdStr,
    todayYmd,
    staffIdsWithEntries,
  });

  const initialEntries: Record<string, string> = {};
  for (const e of entries) {
    if (e.shiftTemplateId) {
      initialEntries[`${e.staffId}__${ymdForDbDate(e.date)}`] = e.shiftTemplateId;
    }
  }

  const initialPreviousWeekEntries: Record<string, string | null> = {};
  for (const e of previousWeekRow?.entries ?? []) {
    initialPreviousWeekEntries[`${e.staffId}__${ymdForDbDate(e.date)}`] = e.shiftTemplateId;
  }

  const holidayMap: Record<string, { name: string; stationClosed: boolean }> = {};
  for (const h of holidays) {
    holidayMap[ymdForDbDate(h.date)] = { name: h.name, stationClosed: h.stationClosed };
  }

  const staffForClient = visibleStaff.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    role: s.role,
  }));

  const blockMap = await getApprovedBlockMap({
    staffIds: visibleStaff.map((s) => s.id),
    rangeStartDate: weekStartDate,
    rangeEndDate: weekEndDate,
  });

  const pendingRequestsCount = pendingCounts[0] + pendingCounts[1];

  const prevWeek = shiftYmd(weekStartYmd, -7);
  const nextWeek = shiftYmd(weekStartYmd, 7);
  const thisWeek = currentWeekStartYmd(effectiveTimeZone, weekStartWeekday);

  return (
    <div>
      <RosterGrid
        key={week.id}
        weekId={week.id}
        weekStartYmd={weekStartYmd}
        weekStartWeekday={weekStartWeekday}
        orgName={org.name}
        weekPublished={week.status === "published"}
        days={days}
        timeZone={effectiveTimeZone}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
        thisWeek={thisWeek}
        todayYmd={todayYmd}
        weekLocked={weekLocked}
        staff={staffForClient}
        templates={templates}
        initialEntries={initialEntries}
        initialPreviousWeekEntries={initialPreviousWeekEntries}
        holidays={holidayMap}
        blockMap={blockMap}
        initialPendingCount={pendingRequestsCount}
        initialOpenRequests={openRequests}
        initialOvertimeSettings={overtimeSettings}
        initialHolidayCalendar={{
          countryCode: location.holidayCountryCode,
          subdivisionCode: location.holidaySubdivisionCode,
          syncYears: getHolidaySyncYears(),
          countries: holidayCountries,
          subdivisions: holidaySubdivisions,
        }}
      />
    </div>
  );
}
