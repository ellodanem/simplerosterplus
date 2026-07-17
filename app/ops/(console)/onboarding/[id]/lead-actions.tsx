"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LeadActions({
  progressId,
  doNotContact,
  needsSupport,
  abandoned,
  resumeSetupUrl,
  canWrite,
}: {
  progressId: string;
  doNotContact: boolean;
  needsSupport: boolean;
  abandoned: boolean;
  resumeSetupUrl: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(action: string, extra?: Record<string, string>) {
    setError(null);
    const res = await fetch(`/api/ops/onboarding/${progressId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(body.error ?? "Action failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function copyResume() {
    try {
      await navigator.clipboard.writeText(resumeSetupUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyResume()}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          {copied ? "Copied" : "Copy resume-setup link"}
        </button>
        {canWrite ? (
          <>
            {abandoned ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => void run("clear_abandoned")}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                Mark as not abandoned
              </button>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={() => void run("mark_contacted")}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
            >
              Mark as contacted
            </button>
            {doNotContact ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => void run("unsuppress")}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                Allow follow-ups
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => void run("suppress")}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50"
              >
                Suppress future follow-ups
              </button>
            )}
            {needsSupport ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => void run("clear_needs_support")}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                Clear needs support
              </button>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-zinc-500">Support role required for write actions.</p>
        )}
      </div>

      {canWrite ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            void run("add_note", { note: note.trim() }).then(() => setNote(""));
          }}
        >
          <label className="text-xs font-medium text-zinc-600">
            Internal note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Visible only in Ops…"
            />
          </label>
          <button
            type="submit"
            disabled={pending || !note.trim()}
            className="self-start rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Add note
          </button>
        </form>
      ) : null}

      <p className="text-xs text-zinc-500">
        Send / schedule follow-up email arrives in Phase 4. Recommended template is shown
        above for planning.
      </p>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
