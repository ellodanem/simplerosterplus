import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getDefaultLocation, type DefaultLocation } from "@/lib/location";
import { formatYmdInZone, startOfLocalDayUtc } from "@/lib/datetime-policy";
import { getRosterWeekStartWeekday } from "@/lib/roster-week-settings";
import {
  DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS,
  getAttendanceLogWindowDays,
  isExpandedAttendanceLog,
} from "@/lib/attendance-log-window";
import {
  currentWeekStartYmd,
  shiftYmd,
  weekStartFromYmd,
} from "@/lib/roster-week";
import { getAttendanceWeekData } from "@/lib/attendance-week";
import { getAttendanceLogData } from "@/lib/attendance-log-data";
import { AttendanceGrid } from "./attendance-grid";
import { AttendanceLog } from "./attendance-log";

export const metadata = {
  title: "Attendance | Simple Roster Plus",
};

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

type ViewName = "log" | "week";
type SearchParams = { view?: string; week?: string; all?: string; staff?: string };

export default async function AttendancePage({
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

  const location = await getDefaultLocation(org.id);
  const effectiveTimeZone = location.timeZone ?? org.timeZone;

  const params = await searchParams;
  const view: ViewName = params.view === "week" ? "week" : "log";
  const expandedLogWindow = isExpandedAttendanceLog(params.all);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Attendance</h1>
          <p className="mt-0.5 text-sm text-zinc-600">
            {org.name} · <span className="font-mono">{effectiveTimeZone}</span> · {location.name}
          </p>
        </div>
      </div>

      <Tabs view={view} />

      {view === "week" ? (
        <WeekTab
          org={org}
          location={location}
          tz={effectiveTimeZone}
          requestedWeek={params.week ?? null}
          staffId={params.staff ?? null}
        />
      ) : (
        <LogTab
          org={org}
          location={location}
          tz={effectiveTimeZone}
          expandedLogWindow={expandedLogWindow}
        />
      )}
    </div>
  );
}

function Tabs({ view }: { view: ViewName }) {
  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
      active
        ? "border-emerald-700 text-emerald-900"
        : "border-transparent text-zinc-500 hover:text-zinc-900"
    }`;
  return (
    <div className="mb-4 border-b border-zinc-200">
      <nav className="flex gap-1" aria-label="Attendance views">
        <Link href="/attendance?view=log" className={tabClass(view === "log")}>
          Log
        </Link>
        <Link href="/attendance?view=week" className={tabClass(view === "week")}>
          Week view
        </Link>
      </nav>
    </div>
  );
}

async function LogTab({
  org,
  location,
  tz,
  expandedLogWindow,
}: {
  org: { id: string; name: string; timeZone: string };
  location: DefaultLocation;
  tz: string;
  expandedLogWindow: boolean;
}) {
  const logWindowDays = getAttendanceLogWindowDays(expandedLogWindow ? "1" : null);
  const todayYmd = formatYmdInZone(new Date(), tz);
  const windowStartYmd = shiftYmd(todayYmd, -(logWindowDays - 1));
  const sinceDate = startOfLocalDayUtc(windowStartYmd, tz);

  const data = await getAttendanceLogData({
    organizationId: org.id,
    locationId: location.id,
    timeZone: tz,
    sinceDate,
  });

  return (
    <AttendanceLog
      key={`${windowStartYmd}:${expandedLogWindow ? "extended" : "default"}`}
      timeZone={tz}
      todayYmd={todayYmd}
      windowStartYmd={windowStartYmd}
      defaultWindowDays={DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS}
      expandedWindow={expandedLogWindow}
      windowDays={logWindowDays}
      graceMinutes={data.graceMinutes}
      staff={data.staff}
      rows={data.rows}
      kpis={data.kpis}
      hasMoreRows={data.hasMoreRows}
      rowLimit={data.rowLimit}
    />
  );
}

async function WeekTab({
  org,
  location,
  tz,
  requestedWeek,
  staffId,
}: {
  org: { id: string; name: string; timeZone: string };
  location: DefaultLocation;
  tz: string;
  requestedWeek: string | null;
  staffId: string | null;
}) {
  const weekStartWeekday = await getRosterWeekStartWeekday(org.id);
  const weekStartYmd =
    requestedWeek && YMD_RE.test(requestedWeek)
      ? weekStartFromYmd(requestedWeek, tz, weekStartWeekday)
      : currentWeekStartYmd(tz, weekStartWeekday);

  const data = await getAttendanceWeekData({
    organizationId: org.id,
    locationId: location.id,
    weekStartYmd,
    timeZone: tz,
  });

  const prevWeek = shiftYmd(weekStartYmd, -7);
  const nextWeek = shiftYmd(weekStartYmd, 7);
  const thisWeek = currentWeekStartYmd(tz, weekStartWeekday);
  const todayYmd = formatYmdInZone(new Date(), tz);

  const selectedStaffId =
    staffId && data.staff.some((s) => s.id === staffId) ? staffId : null;

  return (
    <AttendanceGrid
      key={`${weekStartYmd}:${selectedStaffId ?? "all"}`}
      weekStartYmd={weekStartYmd}
      days={data.days}
      timeZone={tz}
      prevWeek={prevWeek}
      nextWeek={nextWeek}
      thisWeek={thisWeek}
      todayYmd={todayYmd}
      staff={data.staff}
      selectedStaffId={selectedStaffId}
      holidays={data.holidays}
      blockMap={data.blockMap}
      expectedByCell={data.expectedByCell}
      cells={data.cells}
      punches={data.punches}
      overrides={data.overrides}
      graceMinutes={data.graceMinutes}
      irregularCount={data.irregularCount}
      irregularByStaff={data.irregularByStaff}
    />
  );
}
