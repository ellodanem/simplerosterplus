import Link from "next/link";
import { getPlatformOverview } from "@/lib/ops/data";
import { formatUsd } from "@/lib/ops/billing";
import { StatCard, Card, Pill, Sparkline } from "./ops-ui";

export const dynamic = "force-dynamic";

export default async function OperatorOverviewPage() {
  const o = await getPlatformOverview();

  const onlinePct =
    o.devicesTotal > 0 ? Math.round((o.devicesOnline / o.devicesTotal) * 100) : 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Platform Overview</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Health and activity across every organization on the platform.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Active orgs"
          value={o.activeOrgs}
          hint={o.suspendedOrgs > 0 ? `${o.suspendedOrgs} suspended` : `${o.totalOrgs} total`}
        />
        <StatCard label="MRR" value={formatUsd(o.mrrUsd)} hint="from active subscriptions" />
        <StatCard label="Trials ending (7d)" value={o.trialsEndingSoon} hint="needs follow-up" />
        <StatCard
          label="Devices online"
          value={`${o.devicesOnline} / ${o.devicesTotal}`}
          hint={`${onlinePct}% online`}
        />
        <StatCard label="Punches today" value={o.punchesToday.toLocaleString()} hint="all orgs (UTC day)" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Signups (90 days)">
            <div className="p-4">
              <Sparkline points={o.signupSeries.map((p) => p.count)} />
              <p className="mt-2 text-xs text-zinc-500">
                {o.signupSeries.reduce((s, p) => s + p.count, 0)} new organizations in the last 90 days
              </p>
            </div>
          </Card>
        </div>

        <Card title="Attention needed">
          <ul className="divide-y divide-zinc-100">
            {o.attention.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">
                Nothing needs attention. 🎉
              </li>
            ) : (
              o.attention.map((a) => (
                <li key={`${a.organizationId}-${a.kind}`} className="px-4 py-3">
                  <Link
                    href={`/ops/organizations/${a.organizationId}`}
                    className="flex items-center justify-between gap-2 hover:underline"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-zinc-900">
                        {a.name}
                      </span>
                      <span className="block text-xs text-zinc-500">{a.detail}</span>
                    </span>
                    <Pill tone={a.tone}>{a.kind.replace("_", " ")}</Pill>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <Card
          title="Plan mix"
          action={
            <Link href="/ops/organizations" className="text-xs font-medium text-emerald-700 hover:text-emerald-900">
              View all organizations →
            </Link>
          }
        >
          <div className="flex flex-wrap gap-6 p-4">
            {o.planMix.length === 0 ? (
              <p className="text-sm text-zinc-500">No organizations yet.</p>
            ) : (
              o.planMix.map((p) => (
                <div key={p.plan}>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {p.plan}
                  </p>
                  <p className="text-xl font-semibold tabular-nums text-zinc-900">{p.count}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
