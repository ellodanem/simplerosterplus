import Link from "next/link";
import { listAuditLog } from "@/lib/ops/data";
import { Card, formatDateTime } from "../ops-ui";

export const dynamic = "force-dynamic";

function reasonFrom(metadata: string | null): string | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { reason?: unknown };
    return typeof parsed.reason === "string" && parsed.reason ? parsed.reason : null;
  } catch {
    return null;
  }
}

export default async function AuditLogPage() {
  const rows = await listAuditLog({ limit: 150 });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Audit Log</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Append-only record of operator actions across the platform. Most recent first.
      </p>

      <div className="mt-6">
        <Card title={`${rows.length} recent event${rows.length === 1 ? "" : "s"}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-white text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Operator</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No operator actions recorded yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const reason = reasonFrom(r.metadata);
                  return (
                    <tr key={r.id} className="hover:bg-zinc-50/80">
                      <td className="px-4 py-3 text-zinc-500">{formatDateTime(r.createdAt)}</td>
                      <td className="px-4 py-3 text-zinc-700">{r.operatorEmail}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700">
                          {r.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {r.organizationId ? (
                          <Link
                            href={`/ops/organizations/${r.organizationId}`}
                            className="text-emerald-700 hover:underline"
                          >
                            {r.organizationName ?? r.organizationId}
                          </Link>
                        ) : (
                          <span className="text-zinc-500">
                            {r.targetType}
                            {r.targetId ? ` · ${r.targetId}` : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{reason ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
