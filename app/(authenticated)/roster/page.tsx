import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { utcDateFromYmd } from "@/lib/datetime-policy";
import {
  currentWeekStartYmd,
  daysOfWeek,
  shiftYmd,
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

  const params = await searchParams;
  const requestedWeek = params.week && YMD_RE.test(params.week) ? params.week : null;
  const weekStartYmd = requestedWeek
    ? weekStartFromYmd(requestedWeek, org.timeZone)
    : currentWeekStartYmd(org.timeZone);

  const weekStartDate = utcDateFromYmd(weekStartYmd);
  const weekEndDate = utcDateFromYmd(shiftYmd(weekStartYmd, 6));
  const days = daysOfWeek(weekStartYmd);

  const week = await prisma.rosterWeek.upsert({
    where: {
      organizationId_weekStart: {
        organizationId: org.id,
        weekStart: weekStartDate,
      },
    },
    create: {
      organizationId: org.id,
      weekStart: weekStartDate,
      status: "draft",
    },
    update: {},
    select: { id: true, weekStart: true, status: true, notes: true },
  });

  const [staff, templates, entries, holidays] = await Promise.all([
    prisma.staff.findMany({
      where: { organizationId: org.id },
      orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        vacationStart: true,
        vacationEnd: true,
      },
    }),
    prisma.shiftTemplate.findMany({
      where: { organizationId: org.id },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, startTime: true, endTime: true, color: true },
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
  ]);

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

  const staffForClient = staff.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    role: s.role,
    vacationStart: s.vacationStart ? ymdForDbDate(s.vacationStart) : null,
    vacationEnd: s.vacationEnd ? ymdForDbDate(s.vacationEnd) : null,
  }));

  const prevWeek = shiftYmd(weekStartYmd, -7);
  const nextWeek = shiftYmd(weekStartYmd, 7);
  const thisWeek = currentWeekStartYmd(org.timeZone);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Roster</h1>
        <p className="mt-0.5 text-sm text-zinc-600">
          {org.name} · <span className="font-mono">{org.timeZone}</span> · Week of{" "}
          <span className="font-medium">{weekStartYmd}</span>
          {week.status === "published" ? (
            <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
              Published
            </span>
          ) : null}
        </p>
      </div>

      <RosterGrid
        key={week.id}
        weekId={week.id}
        weekStartYmd={weekStartYmd}
        days={days}
        timeZone={org.timeZone}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
        thisWeek={thisWeek}
        staff={staffForClient}
        templates={templates}
        initialEntries={initialEntries}
        holidays={holidayMap}
      />
    </div>
  );
}
