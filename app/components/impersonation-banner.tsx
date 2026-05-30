"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImpersonationBanner({
  orgName,
  asEmail,
}: {
  orgName: string;
  asEmail: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function endSession() {
    setPending(true);
    try {
      const res = await fetch("/api/auth/end-impersonation", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { redirectUrl?: string; error?: string };
      if (!res.ok) return;
      router.push(data.redirectUrl ?? "/ops");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-semibold">Operator session</span>
          {" — "}
          viewing <span className="font-medium">{orgName}</span> as{" "}
          <span className="font-mono text-xs">{asEmail}</span>
          {" "}(read-only, expires in ~30 min)
        </p>
        <button
          type="button"
          onClick={endSession}
          disabled={pending}
          className="shrink-0 rounded-lg border border-amber-400 bg-white px-3 py-1 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {pending ? "Ending…" : "End session"}
        </button>
      </div>
    </div>
  );
}
