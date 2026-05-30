import Link from "next/link";
import { listOrganizationsForOps } from "@/lib/ops/data";
import { formatUsd, planLabel, subscriptionStatusLabel, subscriptionStatusTone } from "@/lib/ops/billing";
import { Card, Pill, formatDate } from "../ops-ui";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = (q ?? "").trim();
  const orgs = await listOrganizationsForOps(search || undefined);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Organizations</h1>
          <p className="mt-1 text-sm text-zinc-600">Every tenant on the platform.</p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search by name…"
            className="w-64 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none ring-emerald-500 focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Search
          </button>
        </form>
      </div>

      <div className="mt-6">
        <Card title={`${orgs.length} organization${orgs.length === 1 ? "" : "s"}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-white text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Staff</th>
                <th className="px-4 py-3 text-right">Devices</th>
                <th className="px-4 py-3 text-right">Admins</th>
                <th className="px-4 py-3 text-right">MRR</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-500">
                    {search ? `No organizations match “${search}”.` : "No organizations yet."}
                  </td>
                </tr>
              ) : (
                orgs.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3">
                      <Link
                        href={`/ops/organizations/${o.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {o.name}
                      </Link>
                      <div className="text-xs text-zinc-500">
                        {o.locations} location{o.locations === 1 ? "" : "s"}
                        {o.isDemo ? " · demo" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{planLabel(o.plan)}</td>
                    <td className="px-4 py-3">
                      {o.suspendedAt ? (
                        <Pill tone="danger">Suspended</Pill>
                      ) : (
                        <Pill tone={subscriptionStatusTone(o.subscriptionStatus)}>
                          {subscriptionStatusLabel(o.subscriptionStatus)}
                        </Pill>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{o.staff}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{o.devices}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{o.admins}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                      {o.mrrUsd > 0 ? formatUsd(o.mrrUsd) : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{formatDate(o.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
