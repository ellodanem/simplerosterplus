"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FeedbackStatusActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: "triaged" | "closed" | "open") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Update failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "open" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void setStatus("triaged")}
          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Mark triaged
        </button>
      ) : null}
      {status !== "closed" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void setStatus("closed")}
          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
        >
          Close
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void setStatus("open")}
          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
        >
          Reopen
        </button>
      )}
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
