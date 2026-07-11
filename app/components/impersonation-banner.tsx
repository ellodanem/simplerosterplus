"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImpersonationBanner({
  orgName,
  asEmail,
  mode = "readonly",
}: {
  orgName: string;
  asEmail: string;
  mode?: "readonly" | "onboarding";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const isOnboarding = mode === "onboarding";

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
    <div
      className={
        isOnboarding
          ? "border-b border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-950"
          : "border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950"
      }
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-semibold">
            {isOnboarding ? "Onboarding simulation" : "Operator session"}
          </span>
          {" — "}
          {isOnboarding ? (
            <>
              replaying setup for <span className="font-medium">{orgName}</span> as{" "}
              <span className="font-mono text-xs">{asEmail}</span>
              {" "}(setup writes only, expires in ~30 min)
            </>
          ) : (
            <>
              viewing <span className="font-medium">{orgName}</span> as{" "}
              <span className="font-mono text-xs">{asEmail}</span>
              {" "}(read-only, expires in ~30 min)
            </>
          )}
        </p>
        <button
          type="button"
          onClick={endSession}
          disabled={pending}
          className={
            isOnboarding
              ? "shrink-0 rounded-lg border border-emerald-400 bg-white px-3 py-1 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
              : "shrink-0 rounded-lg border border-amber-400 bg-white px-3 py-1 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          }
        >
          {pending ? "Ending…" : "End session"}
        </button>
      </div>
    </div>
  );
}
