import Link from "next/link";
import { getBillingOverview } from "@/lib/ops/data";
import {
  formatUsd,
  planLabel,
  subscriptionStatusLabel,
  subscriptionStatusTone,
} from "@/lib/ops/billing";
import { StatCard, Card, Pill, formatDate } from "../ops-ui";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const b = await getBillingOverview();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Billing &amp; Subscriptions
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Revenue and subscription health. Payments will be powered by Stripe; figures below
        mirror the database until the integration lands.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="MRR" value={formatUsd(b.mrrUsd)} />
        <StatCard label="ARR" value={formatUsd(b.arrUsd)} />
        <StatCard label="Active subs" value={b.activeSubscriptions} />
        <StatCard label="Trialing" value={b.trialing} />
        <StatCard label="Past due" value={b.pastDue} hint={b.pastDue > 0 ? "needs dunning" : undefined} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Revenue by plan">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-white text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 text-right">Active subs</th>
                  <th className="px-4 py-3 text-right">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {b.planBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-sm text-zinc-500">
                      No active subscriptions yet.
                    </td>
                  </tr>
                ) : (
                  b.planBreakdown.map((p) => (
                    <tr key={p.plan}>
                      <td className="px-4 py-3 font-medium text-zinc-900">{planLabel(p.plan)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{p.count}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                        {formatUsd(p.mrrUsd)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>

        <Card title="Dunning / needs attention">
          <ul className="divide-y divide-zinc-100">
            {b.dunning.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">
                No past-due accounts or trials ending soon.
              </li>
            ) : (
              b.dunning.map((d) => (
                <li key={d.id} className="px-4 py-3">
                  <Link
                    href={`/ops/organizations/${d.id}`}
                    className="flex items-center justify-between gap-2 hover:underline"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-zinc-900">
                        {d.name}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        {d.trialEndsAt ? `Trial ends ${formatDate(d.trialEndsAt)}` : "Payment issue"}
                      </span>
                    </span>
                    <Pill tone={subscriptionStatusTone(d.subscriptionStatus)}>
                      {subscriptionStatusLabel(d.subscriptionStatus)}
                    </Pill>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Stripe is the planned source of truth for money. Webhooks
        (<span className="font-mono">invoice.payment_failed</span>,{" "}
        <span className="font-mono">customer.subscription.updated</span>) will keep these
        mirrored columns fresh and drive the dunning list. See{" "}
        <span className="font-mono">docs/OPERATOR_CONSOLE.md</span> §3.2.
      </p>
    </div>
  );
}
