"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function DemoStartClient() {
  const router = useRouter();
  const { setActive, isLoaded: orgListLoaded } = useOrganizationList();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Setting up your demo sandbox…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/demo/provision", { method: "POST" });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          clerkOrgId?: string;
          redirectPath?: string;
        };

        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Could not create demo sandbox.");
          return;
        }

        if (!data.clerkOrgId) {
          if (!cancelled) setError("Demo created but organization id is missing.");
          return;
        }

        if (!orgListLoaded || !setActive) {
          await new Promise((r) => setTimeout(r, 400));
        }

        if (setActive) {
          await setActive({ organization: data.clerkOrgId });
        }

        if (!cancelled) {
          setStatus("Demo ready — opening roster…");
          router.replace(data.redirectPath ?? "/roster");
        }
      } catch {
        if (!cancelled) setError("Something went wrong. Try again or start free with your own site.");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [orgListLoaded, router, setActive]);

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-zinc-900">Demo sandbox</h1>
      {error ? (
        <>
          <p className="mt-3 text-sm text-rose-700">{error}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a
              href="/sign-up"
              className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Start Free
            </a>
            <a
              href="/roster"
              className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Go to app
            </a>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-zinc-600">{status}</p>
      )}
    </div>
  );
}
