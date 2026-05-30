import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolveLocation } from "@/lib/location";
import { formatYmdInZone } from "@/lib/datetime-policy";
import { redirectToSetupIfIncomplete } from "@/lib/setup-guard";
import { currentWeekStartYmd, shiftYmd, weekEndYmd } from "@/lib/roster-week";
import { getRosterWeekStartWeekday } from "@/lib/roster-week-settings";
import { includeStaffOnAttendanceWeek } from "@/lib/staff-archive";
import {
  getStaffAttendanceReport,
  MAX_REPORT_RANGE_DAYS,
  ymdRangeInclusive,
} from "@/lib/staff-attendance-report";
import { StaffReportForm } from "../staff-report-form";

export const metadata = {
  title: "Attendance report | Simple Roster Plus",
};

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

type SearchParams = {
  staff?: string;
  start?: string;
  end?: string;
  location?: string;
};

export default async function AttendanceReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await redirectToSetupIfIncomplete({
    organizationId: session.orgId,
    nextPath: "/attendance/report",
  });

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { id: true, name: true, timeZone: true },
  });
  if (!org) redirect("/login");

  const params = await searchParams;
  const location = await resolveLocation(org.id, params.location);
  const timeZone = location.timeZone ?? org.timeZone;
  const weekStartWeekday = await getRosterWeekStartWeekday(org.id);
  const weekStartYmd = currentWeekStartYmd(timeZone, weekStartWeekday);
  const defaultStartYmd = weekStartYmd;
  const defaultEndYmd = weekEndYmd(weekStartYmd);
  const todayYmd = formatYmdInZone(new Date(), timeZone);

  const staffRows = await prisma.staff.findMany({
    where: { organizationId: org.id, locationId: location.id },
    orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, archivedAt: true },
  });

  const visibleStaff = staffRows.filter((s) =>
    includeStaffOnAttendanceWeek(s, weekStartYmd, timeZone),
  );

  const staffIdParam = params.staff ?? "";
  const startParam = params.start && YMD_RE.test(params.start) ? params.start : defaultStartYmd;
  const endParam = params.end && YMD_RE.test(params.end) ? params.end : defaultEndYmd;

  const selectedStaffId =
    staffIdParam && visibleStaff.some((s) => s.id === staffIdParam)
      ? staffIdParam
      : visibleStaff[0]?.id ?? "";

  let initialReport = null;
  let rangeError: string | null = null;

  const canGenerate =
    selectedStaffId &&
    startParam &&
    endParam &&
    endParam >= startParam &&
    YMD_RE.test(startParam) &&
    YMD_RE.test(endParam);

  if (canGenerate && params.staff) {
    const dayCount = ymdRangeInclusive(startParam, endParam).length;
    if (dayCount > MAX_REPORT_RANGE_DAYS) {
      rangeError = `Date range cannot exceed ${MAX_REPORT_RANGE_DAYS} days.`;
    } else {
      initialReport = await getStaffAttendanceReport({
        organizationId: org.id,
        locationId: location.id,
        staffId: selectedStaffId,
        startYmd: startParam,
        endYmd: endParam,
        timeZone,
      });
    }
  }

  const locationQuery = encodeURIComponent(location.id);
  const backHref = `/attendance?location=${locationQuery}`;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Attendance report
          </h1>
          <p className="mt-0.5 text-sm text-zinc-600">
            {org.name} · <span className="font-mono">{timeZone}</span> · {location.name}
          </p>
        </div>
        <Link
          href={backHref}
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          Back to attendance
        </Link>
      </div>

      {rangeError ? (
        <div className="no-print mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {rangeError}
        </div>
      ) : null}

      <StaffReportForm
        staff={visibleStaff.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
        }))}
        locationId={location.id}
        defaultStaffId={selectedStaffId}
        defaultStartYmd={startParam}
        defaultEndYmd={endParam}
        initialReport={initialReport}
        orgName={org.name}
        timeZone={timeZone}
        locationName={location.name}
      />

      <p className="no-print mt-4 text-xs text-zinc-500">
        Today in {timeZone}: {todayYmd}. Pending applies to scheduled days with no punch yet.
      </p>
    </div>
  );
}
