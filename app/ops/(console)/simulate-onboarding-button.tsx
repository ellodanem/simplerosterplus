"use client";

import { useState } from "react";

/**
 * Ops action: reset the dedicated onboarding sandbox and open `/setup`
 * with setup-scoped write access.
 */
export function SimulateOnboardingButton({
  role,
  compact = false,
}: {
  role: string;
  compact?: boolean;
}) {
  const ROLE_RANK: Record<string, number> = {
    readonly: 0,
    support: 1,
    billing: 2,
    superadmin: 3,
  };
  const canSupport = (ROLE_RANK[role] ?? 0) >= 1;

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/onboarding/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectUrl?: string;
      };
      if (!res.ok) {
        setError(data.error || "Simulation failed");
        return;
      }
      window.location.assign(data.redirectUrl ?? "/setup");
    } finally {
      setPending(false);
    }
  }

  if (!canSupport) {
    return (
      <button
        type="button"
        disabled
        title="Support role or higher required"
        className="cursor-not-allowed rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-400"
      >
        Simulate onboarding
      </button>
    );
  }

  return (
    <div className={compact ? "relative" : "relative flex flex-col items-end gap-2"}>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setReason("");
          setOpen(true);
        }}
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
      >
        Simulate onboarding
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-lg">
          <p className="text-sm font-semibold text-zinc-900">Simulate onboarding</p>
          <p className="mt-1 text-xs text-zinc-500">
            Resets the shared Onboarding Sandbox org and opens the setup wizard with
            setup-only write access (30 min). No new customer user is created.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (recorded in the audit log)"
            rows={2}
            className="mt-3 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none ring-emerald-500 focus:ring-2"
          />
          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={run}
              disabled={pending}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {pending ? "Starting…" : "Confirm"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
