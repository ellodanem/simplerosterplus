import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator, operatorCan } from "@/lib/ops/context";
import { getOnboardingLeadDetail, STAGE_LABELS } from "@/lib/ops/onboarding-data";
import { isOnboardingStage } from "@/lib/onboarding-funnel/stages";
import { Card, Pill, formatDateTime } from "../../ops-ui";
import { LeadActions } from "./lead-actions";

export const dynamic = "force-dynamic";

export default async function OnboardingLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, operator] = await Promise.all([params, requireOperator()]);
  const detail = await getOnboardingLeadDetail(id);
  if (!detail) notFound();

  const p = detail.progress;
  const canWrite = operatorCan(operator.role, "support");
  const stageLabel = (s: string) =>
    isOnboardingStage(s) ? STAGE_LABELS[s] : s;

  const errorEvents = detail.events.filter((e) => e.eventName.startsWith("error:"));

  return (
    <div>
      <div className="mb-4">
        <Link href="/ops/onboarding" className="text-sm text-emerald-700 hover:underline">
          ← Onboarding Funnel
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {p.contactName || p.contactEmail || "Onboarding lead"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {p.contactEmail || "No email"}
            {p.businessName ? ` · ${p.businessName}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {p.activatedAt ? <Pill tone="ok">Activated</Pill> : null}
            {p.completedAt ? <Pill tone="ok">Setup complete</Pill> : null}
            {detail.stalled ? <Pill tone="warn">Stalled</Pill> : null}
            {p.needsSupport ? <Pill tone="danger">Needs support</Pill> : null}
            {p.doNotContact ? <Pill tone="neutral">Do not contact</Pill> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {p.organizationId ? (
            <Link
              href={`/ops/organizations/${p.organizationId}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium hover:bg-zinc-50"
            >
              View workspace
            </Link>
          ) : null}
          {p.userId && p.organizationId ? (
            <Link
              href={`/ops/organizations/${p.organizationId}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium hover:bg-zinc-50"
            >
              View user (via org)
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Status">
          <dl className="space-y-2 px-4 py-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Current stage</dt>
              <dd className="font-medium text-zinc-900">{stageLabel(p.currentStage)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Highest reached</dt>
              <dd className="font-medium text-zinc-900">
                {stageLabel(p.highestStageReached)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Signup</dt>
              <dd>{p.signupStartedAt ? formatDateTime(p.signupStartedAt) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Last activity</dt>
              <dd>{formatDateTime(p.lastActivityAt)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Activated</dt>
              <dd>{p.activatedAt ? formatDateTime(p.activatedAt) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Setup completed</dt>
              <dd>{p.completedAt ? formatDateTime(p.completedAt) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Abandoned</dt>
              <dd>
                {p.abandonedAt
                  ? `${formatDateTime(p.abandonedAt)}${p.abandonmentReason ? ` (${p.abandonmentReason})` : ""}`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Follow-up</dt>
              <dd>
                {p.followUpStatus} · ×{p.followUpCount}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Source</dt>
              <dd>{p.signupSource || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Recommended template</dt>
              <dd className="font-mono text-xs">{detail.recommendedTemplate}</dd>
            </div>
          </dl>
        </Card>

        <div className="lg:col-span-2">
          <Card title="Actions">
            <div className="px-4 py-3">
              <LeadActions
                progressId={p.id}
                doNotContact={p.doNotContact}
                needsSupport={p.needsSupport}
                abandoned={p.abandonedAt != null || detail.stalled}
                resumeSetupUrl={detail.resumeSetupUrl}
                canWrite={canWrite}
              />
            </div>
          </Card>
        </div>
      </div>

      {errorEvents.length > 0 ? (
        <div className="mt-6">
          <Card title="Known errors (sanitized)">
            <ul className="divide-y divide-zinc-100">
              {errorEvents.map((e) => {
                const meta =
                  e.metadata && typeof e.metadata === "object"
                    ? (e.metadata as Record<string, unknown>)
                    : {};
                return (
                  <li key={e.id} className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone="danger">{String(meta.category ?? e.eventName)}</Pill>
                      <time className="text-xs text-zinc-400">
                        {formatDateTime(e.createdAt)}
                      </time>
                      {meta.step ? (
                        <span className="text-xs text-zinc-500">step: {String(meta.step)}</span>
                      ) : null}
                      {meta.requestId ? (
                        <span className="font-mono text-[10px] text-zinc-400">
                          {String(meta.requestId)}
                        </span>
                      ) : null}
                    </div>
                    {meta.message ? (
                      <p className="mt-1 text-zinc-700">{String(meta.message)}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Funnel timeline">
          {detail.events.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">No events yet.</p>
          ) : (
            <ol className="divide-y divide-zinc-100">
              {detail.events.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium text-zinc-900">
                      {isOnboardingStage(e.eventName)
                        ? STAGE_LABELS[e.eventName]
                        : e.eventName}
                    </div>
                    <div className="text-xs text-zinc-500">{e.source}</div>
                  </div>
                  <time className="shrink-0 text-xs text-zinc-400">
                    {formatDateTime(e.createdAt)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Follow-up history">
            {detail.followUps.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No follow-ups yet. Manual send ships in Phase 4.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {detail.followUps.map((f) => (
                  <li key={f.id} className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{f.subject}</span>
                      <Pill
                        tone={
                          f.status === "sent"
                            ? "ok"
                            : f.status === "failed"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {f.status}
                      </Pill>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {f.templateKey} · {f.initiatedBy} · {formatDateTime(f.createdAt)}
                      {f.failureReason ? ` · ${f.failureReason}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Internal notes">
            {detail.notes.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">No notes yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {detail.notes.map((n) => (
                  <li key={n.id} className="px-4 py-3 text-sm">
                    <p className="whitespace-pre-wrap text-zinc-800">{n.body}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatDateTime(n.createdAt)}
                      {n.authorOperatorUserId
                        ? ` · operator ${n.authorOperatorUserId.slice(0, 8)}…`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
