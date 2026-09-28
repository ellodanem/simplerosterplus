import Link from "next/link";
import { notFound } from "next/navigation";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { gatePayrollPage } from "@/lib/payroll/access";
import { formatMoney } from "@/lib/payroll/format";
import { FREQUENCY_LABEL } from "@/lib/payroll/frequency";
import { prisma } from "@/lib/prisma";
import { getOrgLocations, resolveLocation } from "@/lib/location";
import { ymdForDbDate } from "@/lib/roster-week";
import { listPayRuns } from "@/lib/payroll/runs";
import { PayrollLinks } from "./payroll-links";
import { StartRunForm } from "./start-run-form";

export const metadata = { title: "Payroll | Simple Roster Plus" };

const STATUS_LABEL = { draft: "Draft", processed: "Approved", void: "Voided" } as const;

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
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Payroll</h1>
      <p className="mt-1 text-sm text-zinc-600">
        {gate.orgName} · {location.name} · {gate.access.country.name}
      </p>
      {locations.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {locations.map((item) => (
            <Link
              key={item.id}
              href={`/payroll?location=${encodeURIComponent(item.id)}`}
              className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm ${
                item.id === location.id ? "bg-emerald-50 font-medium text-emerald-900" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="mt-4">
        <PayrollLinks current="runs" />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Start a pay run</h2>
        <StartRunForm
          extracts={periods.map((period, index) => ({
            id: period.id,
            startDate: ymdForDbDate(period.startDate),
            endDate: ymdForDbDate(period.endDate),
            rowCount: Array.isArray(period.rows) ? period.rows.length : 0,
            latest: index === 0,
          }))}
        />
        <p className="mt-2 text-sm">
          <Link href={`/attendance/pay-period?location=${encodeURIComponent(location.id)}`} className="font-medium text-emerald-800 hover:text-emerald-950">
            Open attendance extracts
          </Link>
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Pay runs</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-zinc-600">No pay runs for this location yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">Cycle</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">People</th>
                  <th className="px-3 py-2 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2">
                      <Link href={`/payroll/runs/${run.id}`} className="font-medium text-emerald-800 hover:text-emerald-950">
                        {run.rangeStart} – {run.rangeEnd}
                      </Link>
                      <div className="text-zinc-500">{FREQUENCY_LABEL[run.frequency]}</div>
                    </td>
                    <td className="px-3 py-2">{run.cycleNumber}</td>
                    <td className="px-3 py-2">{STATUS_LABEL[run.status]}</td>
                    <td className="px-3 py-2">{run.headcount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(run.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
