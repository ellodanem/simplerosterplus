"use client";

import { useState } from "react";
import { Modal } from "@/app/components/modal";

const MAX_MINUTES = 240;

/**
 * Edit the per-org `attendance_grace_minutes` AppSetting from inline on the attendance
 * page. Kept as its own modal (not a full settings page) because v1 has exactly one knob
 * and the value lives where it's read — next to the "Grace window: N min" footer.
 *
 * Parent renders this conditionally so each opening is a fresh mount; the initial value
 * is captured once in useState so a router.refresh() after save doesn't reset typing.
 */
export function GraceSettingsModal({
  initialMinutes,
  onClose,
  onError,
  onSaved,
}: {
  initialMinutes: number;
  onClose: () => void;
  onError: (msg: string) => void;
  onSaved: (msg: string) => void;
}) {
  const [minutes, setMinutes] = useState<string>(String(initialMinutes));
  const [pending, setPending] = useState(false);

  async function save() {
    const n = Number(minutes);
    if (!Number.isFinite(n) || n < 0) {
      onError("Grace must be a non-negative number of minutes.");
      return;
    }
    if (n > MAX_MINUTES) {
      onError(`Grace cannot exceed ${MAX_MINUTES} minutes.`);
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/attendance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graceMinutes: Math.round(n) }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        onError(body.error ?? "Could not save grace setting.");
        setPending(false);
        return;
      }
      onSaved(`Grace window set to ${Math.round(n)} min.`);
    } catch {
      onError("Network error while saving.");
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Attendance grace window" size="md">
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          How many minutes after a scheduled shift start before a punch is counted as{" "}
          <span className="font-semibold text-amber-700">late</span>. Applies to every staff
          member at this location.
        </p>

        <div>
          <label
            htmlFor="grace-minutes"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
          >
            Minutes
          </label>
          <div className="flex items-center gap-2">
            <input
              id="grace-minutes"
              type="number"
              min={0}
              max={MAX_MINUTES}
              step={1}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              autoFocus
            />
            <span className="text-sm text-zinc-500">minutes</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Common values: <span className="font-mono">0</span> (strict),{" "}
            <span className="font-mono">5</span>, <span className="font-mono">10</span>,{" "}
            <span className="font-mono">15</span>. Max <span className="font-mono">{MAX_MINUTES}</span>.
          </p>
        </div>

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
