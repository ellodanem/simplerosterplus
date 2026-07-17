import Link from "next/link";
import { Suspense } from "react";
import { requireOperator } from "@/lib/ops/context";
import {
  formatMedianHours,
  formatPercent,
  formatStalledDuration,
  getOnboardingFunnelSummary,
  listOnboardingLeads,
  resolveOnboardingDateRange,
  STAGE_LABELS,
} from "@/lib/ops/onboarding-data";
import { isOnboardingStage } from "@/lib/onboarding-funnel/stages";
import { Card, Pill, StatCard, formatDate, formatDateTime } from "../ops-ui";
import { OnboardingFilters } from "./onboarding-filters";

export const dynamic = "force-dynamic";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function OnboardingFunnelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOperator();
  const sp = await searchParams;
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const range = resolveOnboardingDateRange({
    range: get("range"),
    from: get("from"),
    to: get("to"),
  });

  const page = Math.max(1, Number(get("page") ?? "1") || 1);

  const [summary, leads] = await Promise.all([
    getOnboardingFunnelSummary(range),
    listOnboardingLeads({
      range,
      q: get("q"),
      stage: get("stage"),
      activated: get("activated") as "yes" | "no" | undefined,
      stalled: get("stalled") as "yes" | "no" | undefined,
      followUp: get("followUp") as "due" | "sent" | "failed" | "none" | undefined,
      doNotContact: get("doNotContact") as "yes" | "no" | undefined,
      source: get("source"),
      page,
      pageSize: 25,
    }),
  ]);

  const maxReached = Math.max(...summary.stages.map((s) => s.reached), 1);
  const totalPages = Math.max(1, Math.ceil(leads.total / leads.pageSize));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Onboarding Funnel
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Who started signup, how far they got, and who appears stalled. Activation = first
        roster published. Dates filter by signup start (UTC).
      </p>

      <div className="mt-4">
        <Suspense fallback={null}>
          <OnboardingFilters
            range={range.preset}
            from={ymd(range.from)}
            to={ymd(range.to)}
          />
        </Suspense>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Signup started" value={summary.signupStarted} tint="sky" />
        <StatCard label="Account created" value={summary.accountCreated} tint="sky" />
        <StatCard label="Workspace created" value={summary.workspaceCreated} tint="teal" />
        <StatCard label="Employees added" value={summary.employeesAdded} tint="teal" />
        <StatCard
          label="First roster created"
          value={summary.firstRosterCreated}
          tint="emerald"
        />
        <StatCard
          label="First roster published"
          value={summary.firstRosterPublished}
          tint="emerald"
          hint="primary activation"
        />
        <StatCard
          label="Onboarding completed"
          value={summary.onboardingCompleted}
          tint="violet"
          hint="setup wizard"
        />
        <StatCard
          label="Currently stalled"
          value={summary.currentlyStalled}
          tint="amber"
        />
        <StatCard label="Follow-ups due" value={summary.followUpsDue} tint="amber" />
        <StatCard label="Follow-ups sent" value={summary.followUpsSent} tint="violet" />
        <StatCard
          label="Activation rate"
          value={formatPercent(summary.activationRate)}
          tint="emerald"
          hint="published ÷ signup started"
        />
      </div>

      <div className="mt-6">
        <Card title="Funnel stages">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-white text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3 text-right">Reached</th>
                  <th className="px-4 py-3 min-w-[140px]">Progress</th>
                  <th className="px-4 py-3 text-right">From prev</th>
                  <th className="px-4 py-3 text-right">From signup</th>
                  <th className="px-4 py-3 text-right">Median time</th>
                  <th className="px-4 py-3 text-right">Stalled here</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {summary.stages.map((s) => (
                  <tr key={s.stage}>
                    <td className="px-4 py-3 font-medium text-zinc-900">{s.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.reached}</td>
                    <td className="px-4 py-3">
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${(s.reached / maxReached) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                      {formatPercent(s.conversionFromPrevious)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                      {formatPercent(s.conversionFromSignup)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                      {formatMedianHours(s.medianHoursToReach)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.stalledAtStage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card
          title={`Leads (${leads.total})`}
          action={
            <span className="text-xs text-zinc-500">
              Sorted: follow-up due → longest stalled → newest signup
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-white text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Signup</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Last activity</th>
                  <th className="px-4 py-3">Stalled</th>
                  <th className="px-4 py-3">Follow-up</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {leads.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                      No onboarding leads in this range. Seed personas with{" "}
                      <code className="text-xs">npm run db:seed</code> in development.
                    </td>
                  </tr>
                ) : (
                  leads.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50/80">
                      <td className="px-4 py-3">
                        <Link
                          href={`/ops/onboarding/${r.id}`}
                          className="font-medium text-emerald-800 hover:underline"
                        >
                          {r.contactName || r.contactEmail || "Unknown"}
                        </Link>
                        {r.contactEmail ? (
                          <div className="text-xs text-zinc-500">{r.contactEmail}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-zinc-800">
                        {r.organizationId ? (
                          <Link
                            href={`/ops/organizations/${r.organizationId}`}
                            className="hover:underline"
                          >
                            {r.businessName || "—"}
                          </Link>
                        ) : (
                          r.businessName || "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {r.signupStartedAt ? formatDate(r.signupStartedAt) : "—"}
                        {r.signupSource ? (
                          <div className="text-[10px] uppercase text-zinc-400">
                            {r.signupSource}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-zinc-900">
                          {isOnboardingStage(r.currentStage)
                            ? STAGE_LABELS[r.currentStage]
                            : r.currentStage}
                        </div>
                        <div className="text-xs text-zinc-500">
                          high:{" "}
                          {isOnboardingStage(r.highestStageReached)
                            ? STAGE_LABELS[r.highestStageReached]
                            : r.highestStageReached}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {formatDateTime(r.lastActivityAt)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zinc-700">
                        {formatStalledDuration(r.stalledMs)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-zinc-800">{r.followUpStatus}</div>
                        <div className="text-xs text-zinc-500">×{r.followUpCount}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.activated ? <Pill tone="ok">Activated</Pill> : null}
                          {r.needsSupport ? <Pill tone="danger">Needs support</Pill> : null}
                          {r.doNotContact ? <Pill tone="neutral">DNC</Pill> : null}
                          {r.stalledMs != null && !r.activated ? (
                            <Pill tone="warn">Stalled</Pill>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm">
              <span className="text-zinc-500">
                Page {leads.page} of {totalPages}
              </span>
              <div className="flex gap-2">
                {leads.page > 1 ? (
                  <Link
                    href={pageHref(sp, leads.page - 1)}
                    className="rounded-lg border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
                  >
                    Previous
                  </Link>
                ) : null}
                {leads.page < totalPages ? (
                  <Link
                    href={pageHref(sp, leads.page + 1)}
                    className="rounded-lg border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function pageHref(
  sp: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => params.append(k, x));
    else params.set(k, v);
  }
  params.set("page", String(page));
  return `/ops/onboarding?${params.toString()}`;
}
