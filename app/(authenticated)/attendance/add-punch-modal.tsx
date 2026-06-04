"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/app/components/modal";
import { StaffAvatar } from "@/app/components/staff-avatar";
import { startOfLocalDayUtc } from "@/lib/datetime-policy";
import type { AttendanceStaff } from "@/lib/attendance-week";
import { useSuggestedPunchType } from "./use-suggested-punch-type";

const HHMM_RE = /^(\d{2}):(\d{2})$/;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Standalone "Add punch" modal opened from the page header. Asks for staff + day + time
 * + direction in one screen — no scheduled-shift defaulting (it doesn't know the day
 * yet). Power-users back-filling several punches reach for this; quick single-cell edits
 * stay in the log row editor.
 *
 * The parent renders this conditionally on `open`, so each opening is a fresh mount —
 * defaults snap to "now today" naturally via useState initializers, no effect required.
 */
export function AddPunchModal({
  open,
  staff,
  timeZone,
  todayYmd,
  onClose,
  onError,
  onAdded,
}: {
  open: boolean;
  staff: AttendanceStaff[];
  timeZone: string;
  todayYmd: string;
  onClose: () => void;
  onError: (msg: string) => void;
  onAdded: (msg: string) => void;
}) {
  const [staffId, setStaffId] = useState<string>("");
  const [day, setDay] = useState<string>(todayYmd);
  const [time, setTime] = useState<string>(() => nowHhmmInZone(timeZone));
  const { type, setType } = useSuggestedPunchType(staffId || null);
  const [note, setNote] = useState<string>("");
  const [pending, setPending] = useState(false);

  const selectedStaff = useMemo(
    () => staff.find((s) => s.id === staffId) ?? null,
    [staff, staffId],
  );

  async function submit() {
    if (!staffId) {
      onError("Pick a staff member.");
      return;
    }
    if (!YMD_RE.test(day)) {
      onError("Day must be YYYY-MM-DD.");
      return;
    }
    const m = HHMM_RE.exec(time);
    if (!m) {
      onError("Time must be HH:MM (24-hour).");
      return;
    }
    setPending(true);
    try {
      const dayStart = startOfLocalDayUtc(day, timeZone);
      const hours = Number(m[1]);
      const minutes = Number(m[2]);
      const punchAt = new Date(dayStart.getTime() + (hours * 60 + minutes) * 60_000);

      const res = await fetch("/api/attendance/punches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          punchAt: punchAt.toISOString(),
          punchType: type,
          note: note.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not add punch");
      onAdded(
        `Added ${type === "in" ? "in" : "out"}-punch for ${selectedStaff?.firstName ?? "staff"} at ${time}.`,
      );
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="md" title="Add punch">
      <div className="space-y-4">
        <section>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Staff
          </label>
          {staff.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-500">No staff at this location yet.</p>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              {selectedStaff ? (
                <StaffAvatar
                  firstName={selectedStaff.firstName}
                  lastName={selectedStaff.lastName}
                  size="sm"
                />
              ) : null}
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="">Select staff…</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                    {s.role ? ` · ${s.role}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Day
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm normal-case"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Time
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </label>
        </section>

        <section>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Direction
          </label>
          <div className="mt-1 inline-flex overflow-hidden rounded-md border border-zinc-300">
            <button
              type="button"
              onClick={() => setType("in")}
              className={`px-3 py-1.5 text-sm font-medium ${
                type === "in"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              In ↓
            </button>
            <button
              type="button"
              onClick={() => setType("out")}
              className={`border-l border-zinc-300 px-3 py-1.5 text-sm font-medium ${
                type === "out"
                  ? "bg-orange-600 text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              Out ↑
            </button>
          </div>
        </section>

        <section>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Note (optional)
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Forgot to clock in this morning"
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm normal-case"
            />
          </label>
        </section>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !staffId}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add punch"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function nowHhmmInZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
