"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ONBOARDING_FOLLOW_UP_TEMPLATE_KEYS,
  type OnboardingFollowUpTemplateKey,
} from "@/lib/email/onboarding-followup";

type FollowUpPreview = {
  to: string | null;
  eligible: boolean;
  ineligibleReason: string | null;
  template: {
    templateKey: OnboardingFollowUpTemplateKey;
    subject: string;
    text: string;
    html: string;
  };
};

const TEMPLATE_LABELS: Record<OnboardingFollowUpTemplateKey, string> = {
  account_workspace_incomplete: "Account ready, workspace incomplete",
  workspace_no_employees: "Workspace ready, no employees",
  employees_no_roster: "Employees added, no roster",
  roster_not_published: "Roster created, not published",
  general_stalled: "General setup help",
};

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
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [preview, setPreview] = useState<FollowUpPreview | null>(null);
  const [templateKey, setTemplateKey] =
    useState<OnboardingFollowUpTemplateKey | null>(null);
  const [scheduledFor, setScheduledFor] = useState("");
  const [followUpBusy, setFollowUpBusy] = useState(false);

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

  async function loadPreview(selected?: OnboardingFollowUpTemplateKey | null) {
    setError(null);
    setFollowUpBusy(true);
    try {
      const query = selected
        ? `?templateKey=${encodeURIComponent(selected)}`
        : "";
      const res = await fetch(
        `/api/ops/onboarding/${progressId}/follow-up${query}`,
      );
      const body = (await res.json().catch(() => ({}))) as
        | FollowUpPreview
        | { error?: string };
      if (!res.ok || !("template" in body)) {
        setError("error" in body ? body.error ?? "Preview failed" : "Preview failed");
        return;
      }
      setPreview(body);
      setTemplateKey(body.template.templateKey);
      setShowFollowUp(true);
    } finally {
      setFollowUpBusy(false);
    }
  }

  function newRequestKey(): string {
    return crypto.randomUUID().replaceAll("-", "");
  }

  async function submitFollowUp(action: "send" | "schedule") {
    if (!preview || !templateKey) return;
    if (
      action === "send" &&
      !window.confirm(`Send “${preview.template.subject}” to ${preview.to}?`)
    ) {
      return;
    }
    if (action === "schedule" && !scheduledFor) {
      setError("Choose a schedule date and time.");
      return;
    }

    setError(null);
    setFollowUpBusy(true);
    try {
      const res = await fetch(`/api/ops/onboarding/${progressId}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          requestKey: newRequestKey(),
          templateKey,
          ...(action === "schedule"
            ? { scheduledFor: new Date(scheduledFor).toISOString() }
            : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Follow-up action failed");
        return;
      }
      setShowFollowUp(false);
      setPreview(null);
      startTransition(() => router.refresh());
    } finally {
      setFollowUpBusy(false);
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
            <button
              type="button"
              disabled={pending || followUpBusy}
              onClick={() => void loadPreview()}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Preview follow-up
            </button>
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

      {showFollowUp && preview ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-zinc-900">Follow-up preview</h3>
              <p className="mt-1 text-xs text-zinc-500">
                To {preview.to ?? "no usable email"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFollowUp(false)}
              className="text-sm text-zinc-500 hover:text-zinc-900"
            >
              Close
            </button>
          </div>

          <label className="mt-4 block text-xs font-medium text-zinc-600">
            Template
            <select
              value={templateKey ?? ""}
              disabled={followUpBusy}
              onChange={(event) => {
                const selected = event.target
                  .value as OnboardingFollowUpTemplateKey;
                setTemplateKey(selected);
                void loadPreview(selected);
              }}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {ONBOARDING_FOLLOW_UP_TEMPLATE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {TEMPLATE_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Subject
            </p>
            <p className="mt-1 font-semibold text-zinc-900">
              {preview.template.subject}
            </p>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {preview.template.text}
            </div>
          </div>

          {!preview.eligible ? (
            <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
              Sending is blocked: {preview.ineligibleReason?.replaceAll("_", " ")}.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <button
              type="button"
              disabled={!preview.eligible || followUpBusy}
              onClick={() => void submitFollowUp("send")}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {followUpBusy ? "Working…" : "Send now"}
            </button>
            <label className="text-xs font-medium text-zinc-600">
              Schedule for
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                className="mt-1 block rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={!preview.eligible || followUpBusy || !scheduledFor}
              onClick={() => void submitFollowUp("schedule")}
              className="rounded-lg border border-emerald-700 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
            >
              Schedule
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Scheduled messages are stored now and will be processed by the Phase 5
            database-backed job. Automatic sequences remain disabled.
          </p>
        </div>
      ) : null}

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

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
