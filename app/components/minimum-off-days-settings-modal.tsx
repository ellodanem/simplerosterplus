"use client";

import { useState } from "react";
import { Modal } from "@/app/components/modal";
import {
  MINIMUM_OFF_DAYS_MAX,
  MINIMUM_OFF_DAYS_MIN,
  isValidMinimumOffDays,
  type MinimumOffDaysSettings,
} from "@/lib/minimum-off-days";

export function MinimumOffDaysSettingsModal({
  initialSettings,
  onClose,
  onSaved,
}: {
  initialSettings: MinimumOffDaysSettings;
  onClose: () => void;
  onSaved: (settings: MinimumOffDaysSettings, message: string) => void;
}) {
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [minimumOffDays, setMinimumOffDays] = useState(String(initialSettings.minimumOffDays));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const parsed = Number(minimumOffDays);
    if (!isValidMinimumOffDays(parsed)) {
      setError(
        `Minimum off days must be a whole number between ${MINIMUM_OFF_DAYS_MIN} and ${MINIMUM_OFF_DAYS_MAX}.`,
      );
      return;
    }

    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/roster/minimum-off-days/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          minimumOffDays: parsed,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as Partial<MinimumOffDaysSettings> & {
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Could not save minimum off days settings.");
        setPending(false);
        return;
      }

      const nextSettings: MinimumOffDaysSettings = {
        enabled: body.enabled ?? enabled,
        minimumOffDays: body.minimumOffDays ?? parsed,
      };
      const dayLabel = nextSettings.minimumOffDays === 1 ? "day" : "days";
      onSaved(
        nextSettings,
        nextSettings.enabled
          ? `Minimum off days set to ${nextSettings.minimumOffDays} ${dayLabel} per week. Staff below this are highlighted on the roster.`
          : "Minimum off days highlighting disabled.",
      );
    } catch {
      setError("Network error while saving.");
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Minimum Off Days" size="md">
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          Highlight staff who do not have enough days off in the current roster week. This is a
          visual reminder only — you can still publish or share the schedule.
        </p>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Highlight short off days</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Staff names blink when they have fewer off days than the minimum below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((current) => !current)}
              aria-pressed={enabled}
              className={`inline-flex h-7 w-12 items-center rounded-full border transition ${
                enabled
                  ? "border-emerald-700 bg-emerald-600"
                  : "border-zinc-300 bg-zinc-200"
              }`}
            >
              <span
                className={`inline-block size-5 rounded-full bg-white shadow-sm transition ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="minimum-off-days"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
          >
            Minimum off days per week
          </label>
          <div className="flex items-center gap-2">
            <input
              id="minimum-off-days"
              type="number"
              min={MINIMUM_OFF_DAYS_MIN}
              max={MINIMUM_OFF_DAYS_MAX}
              step={1}
              value={minimumOffDays}
              onChange={(e) => setMinimumOffDays(e.target.value)}
              disabled={!enabled}
              className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-zinc-100 disabled:text-zinc-400"
            />
            <span className="text-sm text-zinc-500">days</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Default is 1. A day counts as off when there is no shift, or when approved vacation or
            day-off leave applies.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Preview</p>
          <p className="mt-2 text-sm font-medium text-rose-700 animate-roster-off-days-blink rounded px-1">
            Althea F.
          </p>
          <p className="mt-1 text-xs text-zinc-500">Blinking name when below minimum</p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
