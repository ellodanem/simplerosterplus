"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DeviceEnabledToggle({
  id,
  enabled,
  deviceName,
}: {
  id: string;
  enabled: boolean;
  deviceName: string;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function flip() {
    const next = !optimistic;
    setOptimistic(next);
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/devices/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setOptimistic(!next);
        setError(data.error ?? "Could not update");
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-label={`${optimistic ? "Disable" : "Enable"} ${deviceName}`}
        disabled={pending}
        onClick={flip}
        className={`inline-flex h-5 w-9 items-center rounded-full px-0.5 transition-colors disabled:opacity-60 ${
          optimistic ? "bg-emerald-500" : "bg-zinc-300"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            optimistic ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      {error ? <span className="text-[10px] text-red-600">{error}</span> : null}
    </span>
  );
}
