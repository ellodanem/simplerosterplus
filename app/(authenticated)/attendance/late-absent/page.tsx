import Link from "next/link";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolveLocation } from "@/lib/location";
import { redirectToSetupIfIncomplete } from "@/lib/setup-guard";
import {
  getLateAbsentDrillDown,
  getLateAbsentSummary,
  resolveLateAbsentRange,
  type LateAbsentPreset,
} from "@/lib/late-absent-summary";
import { LateAbsentReport } from "../late-absent-report";

export const metadata = {
  title: "Late & Absent | Simple Roster Plus",
};

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

type SearchParams = {
  location?: string;
  preset?: string;
  start?: string;
  end?: string;
  staff?: string;
};

function parsePreset(raw: string | undefined): LateAbsentPreset {
  if (raw === "last" || raw === "custom") return raw;
  return "this";
}

export default async function LateAbsentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirectToSignIn();

  await redirectToSetupIfIncomplete({
    organizationId: session.orgId,
    nextPath: "/attendance/late-absent",
  });

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { id: true, name: true, timeZone: true },
  });
  if (!org) redirectToSignIn();

  const params = await searchParams;
  const location = await resolveLocation(org.id, params.location);
  const timeZone = location.timeZone ?? org.timeZone;
  const preset = parsePreset(params.preset);
  const startParam = params.start && YMD_RE.test(params.start) ? params.start : undefined;
  const endParam = params.end && YMD_RE.test(params.end) ? params.end : undefined;

  const range = await resolveLateAbsentRange({
    locationId: location.id,
    timeZone,
    preset,
    startYmd: startParam,
    endYmd: endParam,
  });

  if ("error" in range) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href={`/attendance?location=${encodeURIComponent(location.id)}`}
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Attendance
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Late &amp; Absent</h1>
        <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {range.error}
        </p>
      </div>
    );
  }

  const staffId = params.staff ?? "";
  const drillDown =
    staffId.length > 0
      ? await getLateAbsentDrillDown({
          organizationId: org.id,
          locationId: location.id,
          staffId,
          startYmd: range.startYmd,
          endYmd: range.endYmd,
          timeZone,
          periodLabel: range.periodLabel,
        })
      : null;

  const summary =
    drillDown?.summary ??
    (await getLateAbsentSummary({
      organizationId: org.id,
      locationId: location.id,
      startYmd: range.startYmd,
      endYmd: range.endYmd,
      timeZone,
      periodLabel: range.periodLabel,
    }));

  return (
    <LateAbsentReport
      orgName={org.name}
      locationId={location.id}
      locationName={location.name}
      timeZone={timeZone}
      preset={preset}
      startYmd={range.startYmd}
      endYmd={range.endYmd}
      periodLabel={range.periodLabel}
      summary={summary}
      drillDown={drillDown}
    />
  );
}
