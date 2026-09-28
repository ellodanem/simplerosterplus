"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PayrollSwitch({
  orgId,
  enabled,
  countryCode,
  canEdit,
}: {
  orgId: string;
  enabled: boolean;
  countryCode: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/organizations/${orgId}/payroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled, reason }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error || "Could not update payroll");
        return;
      }
      setReason("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 p-4 text-sm">
      <p className="text-zinc-700">
        {enabled
          ? `Payroll is on for this organization (${countryCode === "LC" ? "Saint Lucia" : countryCode}). Owners and admins can open it.`
          : "Payroll is hidden. Owners and admins will not see it until you turn it on."}
      </p>
      <p className="text-xs text-zinc-500">Rules today are Saint Lucia. Another country can be added later without turning this on for anyone else.</p>
      {canEdit ? (
        <>
          <label className="block text-zinc-700">
            Reason
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => void toggle()}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {pending ? "Saving…" : enabled ? "Turn payroll off" : "Turn payroll on"}
          </button>
        </>
      ) : (
        <p className="text-xs text-zinc-500">Support role or higher can change this.</p>
      )}
      {error ? <p className="text-red-700">{error}</p> : null}
    </div>
  );
}
