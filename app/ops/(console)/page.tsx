import Link from "next/link";
import { getPlatformOverview } from "@/lib/ops/data";
import {
  formatUsd,
  planLabel,
  subscriptionStatusLabel,
  subscriptionStatusTone,
} from "@/lib/ops/billing";
import { StatCard, Card, Pill, formatDate } from "./ops-ui";

export const dynamic = "force-dynamic";

const RECENT_SIGNUPS_SHOWN = 10;

export default async function OperatorOverviewPage() {
  const o = await getPlatformOverview();

  const onlinePct =
    o.devicesTotal > 0 ? Math.round((o.devicesOnline / o.devicesTotal) * 100) : 0;

  const shownSignups = o.recentSignups.slice(0, RECENT_SIGNUPS_SHOWN);

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
          tint="emerald"
        />
        <StatCard
          label="MRR"
          value={formatUsd(o.mrrUsd)}
          hint="from active subscriptions"
          tint="sky"
        />
        <StatCard
          label="Trials ending (7d)"
          value={o.trialsEndingSoon}
          hint="needs follow-up"
          tint="amber"
        />
        <StatCard
          label="Devices online"
          value={`${o.devicesOnline} / ${o.devicesTotal}`}
          hint={`${onlinePct}% online`}
          tint="violet"
        />
        <StatCard
          label="Punches today"
          value={o.punchesToday.toLocaleString()}
          hint="all orgs (UTC day)"
          tint="teal"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card
            title="New orgs (90 days)"
            action={
              <span className="text-xs tabular-nums text-zinc-500">
                {o.signups90d} in 90d · {o.activated90d} activated
              </span>
            }
          >
            {shownSignups.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No new organizations in the last 90 days.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-white text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Organization</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Activated</th>
                    <th className="px-4 py-3">Signed up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {shownSignups.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/80">
                      <td className="px-4 py-3">
                        <Link
                          href={`/ops/organizations/${row.id}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{planLabel(row.plan)}</td>
                      <td className="px-4 py-3">
                        {row.suspendedAt ? (
                          <Pill tone="danger">Suspended</Pill>
                        ) : (
                          <Pill tone={subscriptionStatusTone(row.subscriptionStatus)}>
                            {subscriptionStatusLabel(row.subscriptionStatus)}
                          </Pill>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone={row.activated ? "ok" : "neutral"}>
                          {row.activated ? "Yes" : "No"}
                        </Pill>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{formatDate(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {shownSignups.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-4 py-3">
                <p className="text-xs text-zinc-500">
                  Activated = published a roster week or recorded a punch. Demo and sandbox orgs excluded.
                </p>
                {o.signups90d > RECENT_SIGNUPS_SHOWN ? (
                  <Link
                    href="/ops/organizations"
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                  >
                    View all organizations →
                  </Link>
                ) : null}
              </div>
            ) : null}
          </Card>
        </div>

        <Card title="Attention needed">
          <ul className="divide-y divide-zinc-100">
            {o.attention.length === 0 && o.openFeedbackCount === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">
                Nothing needs attention. 🎉
              </li>
            ) : (
              <>
                {o.openFeedbackCount > 0 ? (
                  <li className="px-4 py-3">
                    <Link
                      href="/ops/feedback"
                      className="flex items-center justify-between gap-2 hover:underline"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-zinc-900">
                          Open feedback
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {o.openFeedbackCount === 1
                            ? "1 submission waiting for triage"
                            : `${o.openFeedbackCount} submissions waiting for triage`}
                        </span>
                      </span>
                      <Pill tone="warn">feedback</Pill>
                    </Link>
                  </li>
                ) : null}
                {o.attention.map((a) => (
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
                ))}
              </>
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
                    {planLabel(p.plan)}
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
