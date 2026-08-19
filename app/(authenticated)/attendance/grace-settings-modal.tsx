"use client";

import { useState } from "react";
import { Modal } from "@/app/components/modal";

const MAX_MINUTES = 1440;

/**
 * Edit per-org late / absent thresholds from the attendance page.
 * Parent renders this conditionally so each opening is a fresh mount.
 */
export function GraceSettingsModal({
  initialLateAfterMinutes,
  initialAbsentAfterMinutes,
  onClose,
  onError,
  onSaved,
}: {
  initialLateAfterMinutes: number;
  initialAbsentAfterMinutes: number;
  onClose: () => void;
  onError: (msg: string) => void;
  onSaved: (msg: string, lateAfterMinutes: number, absentAfterMinutes: number) => void;
}) {
  const [lateAfter, setLateAfter] = useState<string>(String(initialLateAfterMinutes));
  const [absentAfter, setAbsentAfter] = useState<string>(String(initialAbsentAfterMinutes));
  const [pending, setPending] = useState(false);

  async function save() {
    const late = Number(lateAfter);
    const absent = Number(absentAfter);
    if (!Number.isFinite(late) || late < 0) {
      onError("Late after must be a non-negative number of minutes.");
      return;
    }
    if (!Number.isFinite(absent) || absent < 0) {
      onError("Absent after must be a non-negative number of minutes.");
      return;
    }
    if (late > MAX_MINUTES || absent > MAX_MINUTES) {
      onError(`Thresholds cannot exceed ${MAX_MINUTES} minutes.`);
      return;
    }
    if (Math.round(absent) <= Math.round(late)) {
      onError("Absent after must be greater than late after.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/attendance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lateAfterMinutes: Math.round(late),
          absentAfterMinutes: Math.round(absent),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        onError(body.error ?? "Could not save attendance thresholds.");
        setPending(false);
        return;
      }
      const body = (await res.json()) as {
        lateAfterMinutes: number;
        absentAfterMinutes: number;
      };
      onSaved(
        `Late after ${body.lateAfterMinutes} min · Absent after ${body.absentAfterMinutes} min.`,
        body.lateAfterMinutes,
        body.absentAfterMinutes,
      );
    } catch {
      onError("Network error while saving.");
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Late & absent thresholds" size="md">
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          How long after a scheduled shift start before someone is{" "}
          <span className="font-semibold text-amber-700">late</span>, then{" "}
          <span className="font-semibold text-rose-700">absent</span> if they still have no punch.
          Applies to the live week board and the Late &amp; Absent summary.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="late-after-minutes"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
            >
              Late after
            </label>
            <div className="flex items-center gap-2">
              <input
                id="late-after-minutes"
                type="number"
                min={0}
                max={MAX_MINUTES}
                step={1}
                value={lateAfter}
                onChange={(e) => setLateAfter(e.target.value)}
                className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                autoFocus
              />
              <span className="text-sm text-zinc-500">min</span>
            </div>
          </div>
          <div>
            <label
              htmlFor="absent-after-minutes"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
            >
              Absent after
            </label>
            <div className="flex items-center gap-2">
              <input
                id="absent-after-minutes"
                type="number"
                min={1}
                max={MAX_MINUTES}
                step={1}
                value={absentAfter}
                onChange={(e) => setAbsentAfter(e.target.value)}
                className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <span className="text-sm text-zinc-500">min</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Defaults: <span className="font-mono">15</span> late /{" "}
          <span className="font-mono">60</span> absent. A punch after the absent window is still
          late — they showed up.
        </p>

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
