import Link from "next/link";
import { listTesterFeedback } from "@/lib/ops/data";
import { Card, formatDateTime, Pill } from "../ops-ui";

export const dynamic = "force-dynamic";

function categoryLabel(category: string): string {
  if (category === "bug") return "Bug";
  if (category === "idea") return "Idea";
  return "Question";
}

function categoryTone(category: string): "danger" | "neutral" | "warn" {
  if (category === "bug") return "danger";
  if (category === "idea") return "warn";
  return "neutral";
}

export default async function FeedbackPage() {
  const rows = await listTesterFeedback({ limit: 150 });
  const openCount = rows.filter((r) => r.status === "open").length;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Feedback</h1>
      <p className="mt-1 text-sm text-zinc-600">
        In-app messages from design-partner testers. Newest first. Use Org 360 +{" "}
        <span className="font-medium">Impersonate</span> to reproduce without asking for
        screenshots.
      </p>

      <div className="mt-6">
        <Card title={`${rows.length} submission${rows.length === 1 ? "" : "s"} · ${openCount} open`}>
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              No feedback yet. Testers send messages via{" "}
              <span className="font-medium">Send feedback</span> in the tenant app footer.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {rows.map((r) => (
                <li key={r.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={categoryTone(r.category)}>{categoryLabel(r.category)}</Pill>
                      {r.status !== "open" ? (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                          {r.status}
                        </span>
                      ) : null}
                      <time className="text-xs text-zinc-400">{formatDateTime(r.createdAt)}</time>
                    </div>
                    <Link
                      href={`/ops/organizations/${r.organizationId}`}
                      className="text-sm font-medium text-emerald-700 hover:underline"
                    >
                      {r.orgName} ↗
                    </Link>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{r.message}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    From {r.userEmail}
                    {r.pageUrl ? (
                      <>
                        {" "}
                        · page <span className="font-mono">{r.pageUrl}</span>
                      </>
                    ) : null}
                    {" "}
                    · id <span className="font-mono">{r.id}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
