"use client";

import { useState } from "react";

type MessagingState = {
  entitled: boolean;
  enabled: boolean;
  configured: boolean;
  hasTemplate: boolean;
  monthlyCap: number | null;
  sentThisMonth: number;
  remaining: number | null;
  nearCap: boolean;
  atCap: boolean;
};

export function MessagingSettings({
  initial,
}: {
  initial: MessagingState & { messagingWhatsappEnabled: boolean };
}) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleEnabled(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/messaging", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messagingWhatsappEnabled: next }),
      });
      const data = (await res.json()) as {
        error?: string;
        whatsapp?: MessagingState & { messagingWhatsappEnabled?: boolean };
      };
      if (!res.ok) {
        setError(data.error ?? "Could not update messaging settings.");
        return;
      }
      if (data.whatsapp) {
        setState({
          ...data.whatsapp,
          messagingWhatsappEnabled: next,
        });
      }
    } catch {
      setError("Could not update messaging settings.");
    } finally {
      setBusy(false);
    }
  }

  if (!state.entitled) {
    return (
      <p className="mt-3 text-sm text-zinc-600">
        WhatsApp schedule alerts are available on{" "}
        <span className="font-medium text-zinc-800">Plus with the WhatsApp add-on</span> or{" "}
        <span className="font-medium text-zinc-800">Pro</span>. Manual link sharing is always
        free.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <label className="flex items-start gap-3 text-sm text-zinc-800">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-zinc-300"
          checked={state.messagingWhatsappEnabled}
          disabled={busy}
          onChange={(e) => void toggleEnabled(e.target.checked)}
        />
        <span>
          <span className="font-medium">WhatsApp schedule alerts on publish</span>
          <span className="mt-1 block text-zinc-600">
            When you publish a week, opted-in staff get a WhatsApp link to the roster. They can
            view it online or download an image from that page.
          </span>
        </span>
      </label>

      {state.monthlyCap !== null ? (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          <span className="font-medium text-zinc-900">
            {state.sentThisMonth} / {state.monthlyCap}
          </span>{" "}
          automated WhatsApp messages this month
          {state.nearCap && !state.atCap ? (
            <span className="mt-1 block text-amber-800">You are nearing your monthly limit.</span>
          ) : null}
          {state.atCap ? (
            <span className="mt-1 block text-amber-800">
              Monthly limit reached. Manual share still works.
            </span>
          ) : null}
        </div>
      ) : null}

      {!state.configured || !state.hasTemplate ? (
        <p className="text-xs text-zinc-500">
          Server WhatsApp credentials or the roster message template are not configured yet —
          automated sends will be skipped until setup is complete.
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
