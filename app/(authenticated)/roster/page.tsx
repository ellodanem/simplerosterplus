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
  getRosterWeekStartWeekday,
  weekStartWeekdayLabel,
} from "@/lib/roster-week-settings";
import { getOvertimeSettings } from "@/lib/overtime-settings";
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

type SearchParams = { week?: string };

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

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
  const weekStartLabel = weekStartWeekdayLabel(weekStartWeekday);

  const params = await searchParams;
  const requestedWeek = params.week && YMD_RE.test(params.week) ? params.week : null;
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

  const [staffRows, templates, entries, holidays, pendingCounts] = await Promise.all([
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
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Roster</h1>
        <p className="mt-0.5 text-sm text-zinc-600">
          {org.name} · <span className="font-mono">{effectiveTimeZone}</span> · Week starting{" "}
          {weekStartLabel}{" "}
          <span className="font-medium">{weekStartYmd}</span>
          {week.status === "published" ? (
            <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
              Published
            </span>
          ) : null}
          {weekLocked ? (
            <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-700">
              Locked
            </span>
          ) : null}
        </p>
      </div>

      <RosterGrid
        key={week.id}
        weekId={week.id}
        weekStartYmd={weekStartYmd}
        weekStartWeekday={weekStartWeekday}
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
        holidays={holidayMap}
        blockMap={blockMap}
        initialPendingCount={pendingRequestsCount}
        initialOvertimeSettings={overtimeSettings}
      />
    </div>
  );
}
