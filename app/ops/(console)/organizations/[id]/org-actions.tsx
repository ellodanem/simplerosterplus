"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLE_RANK: Record<string, number> = {
  readonly: 0,
  support: 1,
  billing: 2,
  superadmin: 3,
};

function can(role: string, min: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[min] ?? 99);
}

type Confirm = {
  key: string;
  label: string;
  description: string;
  endpoint: string;
  body: Record<string, unknown>;
  danger?: boolean;
  withReason?: boolean;
};

export function OrgActions({
  orgId,
  suspended,
  isDemo,
  role,
}: {
  orgId: string;
  suspended: boolean;
  isDemo: boolean;
  role: string;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/ops/organizations/${orgId}`;
  const canSuspend = can(role, "superadmin");
  const canBilling = can(role, "billing");

  function open(c: Confirm) {
    setError(null);
    setReason("");
    setConfirm(c);
  }

  async function run() {
    if (!confirm) return;
    setPending(true);
    setError(null);
    try {
      const body = confirm.withReason ? { ...confirm.body, reason } : confirm.body;
      const res = await fetch(confirm.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }
      setConfirm(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const noActions = !canSuspend && !canBilling;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled
          title="Read-only impersonation ships after a read-only mode exists in the tenant app (see roadmap)"
          className="cursor-not-allowed rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-400"
        >
          Impersonate
        </button>

        {canBilling && isDemo ? (
          <button
            type="button"
            onClick={() =>
              open({
                key: "convert",
                label: "Convert demo to trial",
                description: "Clears demo flags and starts a 14-day trial for this organization.",
                endpoint: `${base}/convert-demo`,
                body: { days: 14 },
              })
            }
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
          >
            Convert to trial
          </button>
        ) : null}

        {canBilling ? (
          <button
            type="button"
            onClick={() =>
              open({
                key: "extend",
                label: "Extend trial by 14 days",
                description: "Adds 14 days from the later of today or the current trial end date.",
                endpoint: `${base}/extend-trial`,
                body: { days: 14 },
              })
            }
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Extend trial +14d
          </button>
        ) : null}

        {canSuspend ? (
          suspended ? (
            <button
              type="button"
              onClick={() =>
                open({
                  key: "reactivate",
                  label: "Reactivate organization",
                  description: "Restores access for this organization.",
                  endpoint: `${base}/suspend`,
                  body: { action: "reactivate" },
                  withReason: true,
                })
              }
              className="rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Reactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                open({
                  key: "suspend",
                  label: "Suspend organization",
                  description: "Blocks access for this organization until reactivated.",
                  endpoint: `${base}/suspend`,
                  body: { action: "suspend" },
                  danger: true,
                  withReason: true,
                })
              }
              className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              Suspend
            </button>
          )
        ) : null}
      </div>

      {noActions ? (
        <p className="text-xs text-zinc-400">Your role has read-only access.</p>
      ) : null}

      {confirm ? (
        <div className="w-80 rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-lg">
          <p className="text-sm font-semibold text-zinc-900">{confirm.label}</p>
          <p className="mt-1 text-xs text-zinc-500">{confirm.description}</p>
          {confirm.withReason ? (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (recorded in the audit log)"
              rows={2}
              className="mt-3 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          ) : null}
          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirm(null)}
              disabled={pending}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={run}
              disabled={pending}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60 ${
                confirm.danger ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-700 hover:bg-emerald-800"
              }`}
            >
              {pending ? "Working…" : "Confirm"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
