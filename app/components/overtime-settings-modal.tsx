"use client";

import { useState } from "react";
import { Modal } from "@/app/components/modal";
import {
  OVERTIME_APPROACHING_BUFFER_HOURS,
  OVERTIME_WEEKLY_THRESHOLD_MAX,
  OVERTIME_WEEKLY_THRESHOLD_MIN,
  type OvertimeSettings,
} from "@/lib/overtime";

export function OvertimeSettingsModal({
  initialSettings,
  onClose,
  onSaved,
}: {
  initialSettings: OvertimeSettings;
  onClose: () => void;
  onSaved: (settings: OvertimeSettings, message: string) => void;
}) {
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [threshold, setThreshold] = useState(String(initialSettings.weeklyThresholdHours));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const parsed = Number(threshold);
    if (!Number.isInteger(parsed)) {
      setError("Weekly overtime threshold must be a whole number of hours.");
      return;
    }
    if (parsed < OVERTIME_WEEKLY_THRESHOLD_MIN || parsed > OVERTIME_WEEKLY_THRESHOLD_MAX) {
      setError(
        `Weekly overtime threshold must be between ${OVERTIME_WEEKLY_THRESHOLD_MIN} and ${OVERTIME_WEEKLY_THRESHOLD_MAX} hours.`,
      );
      return;
    }

    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/overtime/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          weeklyThresholdHours: parsed,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as Partial<OvertimeSettings> & {
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Could not save overtime settings.");
        setPending(false);
        return;
      }

      const nextSettings: OvertimeSettings = {
        enabled: body.enabled ?? enabled,
        weeklyThresholdHours: body.weeklyThresholdHours ?? parsed,
      };
      onSaved(
        nextSettings,
        nextSettings.enabled
          ? `Overtime alerts enabled at ${nextSettings.weeklyThresholdHours} hours/week.`
          : "Overtime alerts disabled.",
      );
    } catch {
      setError("Network error while saving.");
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Overtime Alerts" size="md">
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          Keep overtime simple: roster uses scheduled hours, attendance uses worked hours, and
          staff are only flagged when they are close to the weekly limit.
        </p>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Enable overtime alerts</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Shows weekly summaries and flags staff nearing overtime.
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
            htmlFor="weekly-threshold-hours"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
          >
            Weekly overtime threshold
          </label>
          <div className="flex items-center gap-2">
            <input
              id="weekly-threshold-hours"
              type="number"
              min={OVERTIME_WEEKLY_THRESHOLD_MIN}
              max={OVERTIME_WEEKLY_THRESHOLD_MAX}
              step={1}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              disabled={!enabled}
              className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-zinc-100 disabled:text-zinc-400"
            />
            <span className="text-sm text-zinc-500">hours</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Approaching OT appears within{" "}
            <span className="font-mono">{OVERTIME_APPROACHING_BUFFER_HOURS}</span> hours of the
            weekly limit.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Preview</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-zinc-100 px-2 py-1 font-medium text-zinc-700">
              {threshold || initialSettings.weeklyThresholdHours}h scheduled
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">
              Approaching OT
            </span>
            <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-800">
              Over OT
            </span>
          </div>
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
