"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/app/components/modal";
import { WEEKDAY_OPTIONS } from "@/lib/roster-week-settings";

export function WeekStartSettings({
  initialWeekday,
  onClose,
}: {
  initialWeekday: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [weekday, setWeekday] = useState(String(initialWeekday));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const n = Number(weekday);
    if (!Number.isInteger(n) || n < 0 || n > 6) {
      setError("Choose a valid day.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/roster/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartWeekday: n }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not save.");
        setPending(false);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Network error while saving.");
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Roster week start" size="md">
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          The first day of your work week. Navigation and new weeks use this anchor; existing
          saved weeks keep their original start dates.
        </p>

        <div>
          <label
            htmlFor="week-start-weekday"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
          >
            Week starts on
          </label>
          <select
            id="week-start-weekday"
            value={weekday}
            onChange={(e) => setWeekday(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
          >
            {WEEKDAY_OPTIONS.map((o) => (
              <option key={o.value} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
