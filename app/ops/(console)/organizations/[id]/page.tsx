import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/ops/context";
import { getOrganizationDetail } from "@/lib/ops/data";
import { stripeConfigured, stripeCustomerUrl } from "@/lib/ops/stripe";
import { OrgActions } from "./org-actions";
import {
  formatUsd,
  planLabel,
  subscriptionStatusLabel,
  subscriptionStatusTone,
} from "@/lib/ops/billing";
import { StatCard, Card, Pill, Sparkline, formatDate, formatDateTime } from "../../ops-ui";

export const dynamic = "force-dynamic";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [operator, detail] = await Promise.all([requireOperator(), getOrganizationDetail(id)]);
  if (!detail) notFound();

  const { org, counts, ownerEmail, recentAudit, punchSeries, mrrUsd } = detail;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/ops/organizations" className="hover:text-emerald-700">
          Organizations
        </Link>
        <span>/</span>
        <span className="text-zinc-700">{org.name}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{org.name}</h1>
            {org.suspendedAt ? (
              <Pill tone="danger">Suspended</Pill>
            ) : (
              <Pill tone={subscriptionStatusTone(org.subscriptionStatus)}>
                {subscriptionStatusLabel(org.subscriptionStatus)}
              </Pill>
            )}
            {org.isDemo ? <Pill tone="neutral">Demo</Pill> : null}
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-500">{org.id}</p>
        </div>
        <OrgActions
          orgId={org.id}
          suspended={org.suspendedAt !== null}
          isDemo={org.isDemo}
          role={operator.role}
          stripeConfigured={stripeConfigured()}
          stripeLinked={org.stripeCustomerId !== null}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Locations" value={counts.locations} />
        <StatCard label="Staff" value={counts.staff} />
        <StatCard label="Admin logins" value={counts.admins} />
        <StatCard label="Devices" value={counts.devices} />
        <StatCard label="Created" value={formatDate(org.createdAt)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Organization details">
          <dl className="divide-y divide-zinc-100 text-sm">
            <Row label="Timezone" value={org.timeZone} />
            <Row label="Owner" value={ownerEmail ?? "—"} />
            <Row label="Plan" value={planLabel(org.plan)} />
            <Row
              label="Subscription"
              value={subscriptionStatusLabel(org.subscriptionStatus)}
            />
            <Row label="Trial ends" value={formatDate(org.trialEndsAt)} />
            <Row label="Demo expires" value={formatDate(org.demoExpiresAt)} />
            <Row
              label="Device trial"
              value={
                org.deviceTrialStartedAt
                  ? `${formatDate(org.deviceTrialStartedAt)} → ${formatDate(org.deviceTrialExpiresAt)}${
                      org.deviceTrialExtensionUsed ? " (+ext)" : ""
                    }`
                  : "—"
              }
            />
            <Row
              label="Staff / cap"
              value={
                counts.staff +
                (org.plan === "free" || !org.plan
                  ? ` / 10 (free)`
                  : org.plan === "plus" || org.plan === "starter"
                    ? ` / 50 (plus)`
                    : org.plan === "pro"
                      ? ` / 100 (pro)`
                      : "")
              }
            />
            <Row
              label="Locations / cap"
              value={
                counts.locations +
                (org.plan === "free" || !org.plan ? ` / 2 (free)` : " (unlimited)")
              }
            />
            <Row
              label="Add-ons"
              value={
                [
                  org.addonDeviceQty > 0 ? `${org.addonDeviceQty} device` : null,
                  org.addonAdminQty > 0 ? `${org.addonAdminQty} admin` : null,
                  org.addonWhatsapp ? "WhatsApp" : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />
          </dl>
        </Card>

        <Card title="Billing summary">
          <div className="space-y-3 p-4 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-zinc-500">Plan</span>
              <span className="font-medium text-zinc-900">{planLabel(org.plan)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-zinc-500">MRR</span>
              <span className="font-medium text-zinc-900">
                {mrrUsd > 0 ? `${formatUsd(mrrUsd)}/mo` : "—"}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-zinc-500">Next renewal</span>
              <span className="font-medium text-zinc-900">{formatDate(org.currentPeriodEnd)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-zinc-500">Stripe customer</span>
              {org.stripeCustomerId ? (
                <a
                  href={stripeCustomerUrl(org.stripeCustomerId)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-emerald-700 hover:underline"
                >
                  {org.stripeCustomerId} ↗
                </a>
              ) : (
                <span className="font-mono text-xs text-zinc-500">not linked</span>
              )}
            </div>
            {stripeConfigured() ? (
              <p className="text-xs text-zinc-500">
                Billing fields mirror Stripe via webhooks. Use{" "}
                <span className="font-medium">Sync from Stripe</span> to reconcile on demand.
              </p>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Stripe isn’t configured yet (set <span className="font-mono">STRIPE_SECRET_KEY</span>).
                Values shown mirror the database.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Operator activity (audit)">
            <ul className="divide-y divide-zinc-100">
              {recentAudit.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-zinc-500">
                  No operator actions recorded for this organization yet.
                </li>
              ) : (
                recentAudit.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{a.action}</p>
                      <p className="text-xs text-zinc-500">
                        {a.targetType}
                        {a.targetId ? ` · ${a.targetId}` : ""} · {a.operator.email}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-zinc-400">
                      {formatDateTime(a.createdAt)}
                    </time>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>

        <Card title="Punches (30 days)">
          <div className="p-4">
            <Sparkline points={punchSeries.map((p) => p.count)} />
            <p className="mt-2 text-xs text-zinc-500">
              {punchSeries.reduce((s, p) => s + p.count, 0)} punches in the last 30 days
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-900">{value}</dd>
    </div>
  );
}
