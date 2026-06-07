import Link from "next/link";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  getOrgLocations,
  resolveLocation,
  type DefaultLocation,
} from "@/lib/location";
import { formatYmdInZone, startOfLocalDayUtc } from "@/lib/datetime-policy";
import { getRosterWeekStartWeekday } from "@/lib/roster-week-settings";
import {
  DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS,
  getAttendanceLogWindowDays,
  isExpandedAttendanceLog,
} from "@/lib/attendance-log-window";
import { getOvertimeSettings } from "@/lib/overtime-settings";
import { redirectToSetupIfIncomplete } from "@/lib/setup-guard";
import {
  currentWeekStartYmd,
  shiftYmd,
  weekStartFromYmd,
} from "@/lib/roster-week";
import { getAttendanceWeekData } from "@/lib/attendance-week";
import { getAttendanceLogData } from "@/lib/attendance-log-data";
import { getLastFiledCutoffYmd, getLatestFiledPayPeriod } from "@/lib/pay-period-last-filed";
import { payPeriodToYmd } from "@/lib/pay-period-db";
import { UnmappedPunchesBanner } from "@/app/components/unmapped-punches-banner";
import { AttendanceGrid } from "./attendance-grid";
import { AttendanceLog } from "./attendance-log";
import { AttendanceFilterProvider } from "./attendance-filter-context";
import { AttendanceFilters } from "./attendance-filters";

export const metadata = {
  title: "Attendance | Simple Roster Plus",
};

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

type ViewName = "log" | "week";
type SearchParams = {
  view?: string;
  week?: string;
  all?: string;
  staff?: string;
  location?: string;
  archived?: string;
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirectToSignIn();

  await redirectToSetupIfIncomplete({
    organizationId: session.orgId,
    nextPath: "/attendance",
  });

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { id: true, name: true, timeZone: true },
  });
  if (!org) redirectToSignIn();

  const params = await searchParams;
  const location = await resolveLocation(org.id, params.location);
  const effectiveTimeZone = location.timeZone ?? org.timeZone;
  const [locations, departments] = await Promise.all([
    getOrgLocations(org.id),
    prisma.department.findMany({
      where: { organizationId: org.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true },
    }),
  ]);
  const departmentNames = departments.map((d) => d.name);

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
        <div className="flex items-center gap-2">
          <Link
            href={`/attendance/report?location=${encodeURIComponent(location.id)}`}
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            Attendance report
          </Link>
          <Link
            href={`/attendance/pay-period?location=${encodeURIComponent(location.id)}`}
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            Extract Pay Period
          </Link>
        </div>
      </div>

      <Tabs view={view} locationId={location.id} />

      <Suspense fallback={null}>
      <AttendanceFilterProvider>
          <AttendanceFilters
            locations={locations}
            currentLocationId={location.id}
            departments={departmentNames}
          />

        {view === "log" ? (
          <FiledPayPeriodBanner locationId={location.id} />
        ) : null}

        {view === "week" ? (
          <WeekTab
            org={org}
            location={location}
            tz={effectiveTimeZone}
            requestedWeek={params.week ?? null}
            staffId={params.staff ?? null}
            showArchivedStaff={params.archived === "1"}
          />
        ) : (
          <LogTab
            org={org}
            location={location}
            tz={effectiveTimeZone}
            expandedLogWindow={expandedLogWindow}
          />
        )}
      </AttendanceFilterProvider>
      </Suspense>
    </div>
  );
}

async function FiledPayPeriodBanner({ locationId }: { locationId: string }) {
  const latest = await getLatestFiledPayPeriod(locationId);
  if (!latest) return null;
  const start = payPeriodToYmd(latest.startDate);
  const end = payPeriodToYmd(latest.endDate);
  const filed = latest.createdAt.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      Last Extract Pay Period filed:{" "}
      <span className="font-semibold">
        {start} – {end}
      </span>{" "}
      on {filed}. The active log hides punches filed in earlier periods.
    </div>
  );
}

function Tabs({ view, locationId }: { view: ViewName; locationId: string }) {
  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
      active
        ? "border-emerald-700 text-emerald-900"
        : "border-transparent text-zinc-500 hover:text-zinc-900"
    }`;
  const logHref = `/attendance?view=log&location=${encodeURIComponent(locationId)}`;
  const weekHref = `/attendance?view=week&location=${encodeURIComponent(locationId)}`;
  return (
    <div className="mb-4 border-b border-zinc-200">
      <nav className="flex gap-1" aria-label="Attendance views">
        <Link href={logHref} className={tabClass(view === "log")}>
          Log
        </Link>
        <Link href={weekHref} className={tabClass(view === "week")}>
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
  const lastFiledCutoff = await getLastFiledCutoffYmd(location.id);
  const sinceYmd =
    lastFiledCutoff && lastFiledCutoff > windowStartYmd ? lastFiledCutoff : windowStartYmd;
  const sinceDate = startOfLocalDayUtc(sinceYmd, tz);

  const [data, unmappedPunchCount] = await Promise.all([
    getAttendanceLogData({
      organizationId: org.id,
      locationId: location.id,
      timeZone: tz,
      sinceDate,
    }),
    prisma.attendanceLog.count({
      where: {
        organizationId: org.id,
        locationId: location.id,
        staffId: null,
        deviceUserId: { not: null },
      },
    }),
  ]);

  return (
    <>
      <UnmappedPunchesBanner count={unmappedPunchCount} />
      <AttendanceLog
      key={`${windowStartYmd}:${expandedLogWindow ? "extended" : "default"}`}
      timeZone={tz}
      todayYmd={todayYmd}
      windowStartYmd={sinceYmd}
      defaultWindowDays={DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS}
      expandedWindow={expandedLogWindow}
      windowDays={logWindowDays}
      graceMinutes={data.graceMinutes}
      staff={data.staff}
      rows={data.rows}
      kpis={data.kpis}
      hasMoreRows={data.hasMoreRows}
      rowLimit={data.rowLimit}
      locationId={location.id}
    />
    </>
  );
}

async function WeekTab({
  org,
  location,
  tz,
  requestedWeek,
  staffId,
  showArchivedStaff,
}: {
  org: { id: string; name: string; timeZone: string };
  location: DefaultLocation;
  tz: string;
  requestedWeek: string | null;
  staffId: string | null;
  showArchivedStaff: boolean;
}) {
  const weekStartWeekday = await getRosterWeekStartWeekday(org.id);
  const weekStartYmd =
    requestedWeek && YMD_RE.test(requestedWeek)
      ? weekStartFromYmd(requestedWeek, tz, weekStartWeekday)
      : currentWeekStartYmd(tz, weekStartWeekday);

  const [data, overtimeSettings] = await Promise.all([
    getAttendanceWeekData({
      organizationId: org.id,
      locationId: location.id,
      weekStartYmd,
      timeZone: tz,
      showArchivedStaff,
    }),
    getOvertimeSettings(org.id),
  ]);

  const prevWeek = shiftYmd(weekStartYmd, -7);
  const nextWeek = shiftYmd(weekStartYmd, 7);
  const thisWeek = currentWeekStartYmd(tz, weekStartWeekday);
  const todayYmd = formatYmdInZone(new Date(), tz);

  const selectedStaffId =
    staffId && data.staff.some((s) => s.id === staffId) ? staffId : null;

  return (
    <AttendanceGrid
      key={`${weekStartYmd}:${selectedStaffId ?? "all"}:${showArchivedStaff ? "archived" : "active"}`}
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
      initialOvertimeSettings={overtimeSettings}
      locationId={location.id}
    />
  );
}
