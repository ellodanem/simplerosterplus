import { notFound } from "next/navigation";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { gatePayrollPage } from "@/lib/payroll/access";
import { prisma } from "@/lib/prisma";
import { getOrgLocations, resolveLocation } from "@/lib/location";
import { ymdForDbDate } from "@/lib/roster-week";
import { listPayRuns } from "@/lib/payroll/runs";
import { PayRunsScreen } from "./pay-runs-screen";

export const metadata = { title: "Payroll | Simple Roster Plus" };

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const gate = await gatePayrollPage();
  if (gate.kind === "signin") redirectToSignIn();
  if (gate.kind === "hidden") notFound();
  if (gate.kind === "unsupported") {
    return <p className="text-sm text-zinc-700">{gate.message}</p>;
  }

  const params = await searchParams;
  const location = await resolveLocation(gate.access.organizationId, params.location);
  const locations = await getOrgLocations(gate.access.organizationId);
  const [runs, periods] = await Promise.all([
    listPayRuns(gate.access, location.id),
    prisma.payPeriod.findMany({
      where: { organizationId: gate.access.organizationId, locationId: location.id },
      orderBy: [{ endDate: "desc" }, { createdAt: "desc" }],
      take: 24,
    }),
  ]);

  return (
    <PayRunsScreen
      orgName={gate.orgName}
      locationName={location.name}
      countryName={gate.access.country.name}
      locations={locations}
      currentLocationId={location.id}
      runs={runs}
      extracts={periods.map((period, index) => ({
        id: period.id,
        startDate: ymdForDbDate(period.startDate),
        endDate: ymdForDbDate(period.endDate),
        rowCount: Array.isArray(period.rows) ? period.rows.length : 0,
        latest: index === 0,
      }))}
      attendanceHref={`/attendance/pay-period?location=${encodeURIComponent(location.id)}`}
    />
  );
}
