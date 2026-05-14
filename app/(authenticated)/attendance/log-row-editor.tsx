"use client";

import { useState } from "react";
import { Modal } from "@/app/components/modal";
import { StaffAvatar } from "@/app/components/staff-avatar";
import { startOfLocalDayUtc } from "@/lib/datetime-policy";
import {
  presenceClasses,
  presenceLabel,
} from "@/lib/attendance-policy";
import type { AttendanceStaff } from "@/lib/attendance-week";
import type { LogRow } from "@/lib/attendance-log-data";
import { PunchMethodBadge } from "./punch-method-badge";

const HHMM_RE = /^(\d{2}):(\d{2})$/;

/**
 * Per-row editor opened when a log row is clicked. Lets the supervisor:
 *  - edit the punch's time-of-day (records `CORRECTED` audit on first change)
 *  - flip its direction (in ↔ out) for cases where the device or operator picked wrong
 *  - delete it
 *  - mark the row's day as manual present / manual absent, or clear that override
 *
 * Same actions the grid's cell editor exposed; relocated to the row so it works without
 * a grid being on screen.
 */
export function LogRowEditor({
  row,
  staff,
  timeZone,
  onClose,
  onError,
  onNotice,
}: {
  row: LogRow;
  staff: AttendanceStaff | null;
  timeZone: string;
  onClose: () => void;
  onError: (msg: string) => void;
  onNotice: (msg: string) => void;
}) {
  const initialTime = formatTimeInZone(row.punch.punchAt, timeZone);
  const [time, setTime] = useState<string>(initialTime);
  const [type, setType] = useState<"in" | "out">(row.punch.punchType);
  const [pending, setPending] = useState(false);
  // Two-step inline confirm replaces window.confirm — keeps the destructive action
  // visually inside the modal (matches the look of the rest of the app).
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const status = row.dayStatus;
  const cls = presenceClasses(status);
  const dayYmd = row.dayYmd;

  async function saveEdit() {
    const m = HHMM_RE.exec(time);
    if (!m) {
      onError("Time must be HH:MM (24-hour).");
      return;
    }
    setPending(true);
    try {
      const dayStart = startOfLocalDayUtc(dayYmd, timeZone);
      const hours = Number(m[1]);
      const minutes = Number(m[2]);
      const punchAt = new Date(dayStart.getTime() + (hours * 60 + minutes) * 60_000);

      const body: Record<string, unknown> = {};
      if (punchAt.toISOString() !== row.punch.punchAt) body.punchAt = punchAt.toISOString();
      if (type !== row.punch.punchType) body.punchType = type;

      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }

      const res = await fetch(`/api/attendance/punches/${encodeURIComponent(row.punch.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save punch");
      onNotice("Punch updated.");
      onClose();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function deletePunch() {
    setPending(true);
    try {
      const res = await fetch(`/api/attendance/punches/${encodeURIComponent(row.punch.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not delete punch");
      onNotice("Punch deleted.");
      onClose();
    } catch (e) {
      onError((e as Error).message);
      setConfirmingDelete(false);
    } finally {
      setPending(false);
    }
  }

  async function setOverride(next: "present" | "absent" | null) {
    if (!staff) return;
    setPending(true);
    try {
      const res = await fetch("/api/attendance/overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staff.id,
          date: dayYmd,
          status: next,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save override");
      onNotice(next === null ? "Override cleared." : `Day marked ${next}.`);
      onClose();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} size="md" title="Edit punch">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {staff ? (
            <StaffAvatar firstName={staff.firstName} lastName={staff.lastName} size="lg" />
          ) : (
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600">
              ?
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-900">
              {staff ? `${staff.firstName} ${staff.lastName}` : "Unmatched punch"}
            </div>
            <div className="truncate text-xs text-zinc-500">
              {staff?.role ?? "—"} · {dayYmd}
            </div>
          </div>
          <span
            className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls.solid}`}
            title={presenceLabel(status)}
          >
            {presenceLabel(status)}
          </span>
        </div>

        {row.punch.corrected ? (
          <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
            This punch was corrected. Original time:{" "}
            <span className="font-mono">
              {row.punch.originalPunchAt
                ? formatTimeInZone(row.punch.originalPunchAt, timeZone)
                : "?"}
            </span>
            .
          </div>
        ) : null}

        <section>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Punch
            </h3>
            <PunchMethodBadge
              source={row.punch.source}
              verifyMethod={row.punch.verifyMethod}
            />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-zinc-300">
              <button
                type="button"
                onClick={() => setType("in")}
                className={`px-2.5 py-1 text-sm font-medium ${
                  type === "in"
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                In
              </button>
              <button
                type="button"
                onClick={() => setType("out")}
                className={`border-l border-zinc-300 px-2.5 py-1 text-sm font-medium ${
                  type === "out"
                    ? "bg-orange-600 text-white"
                    : "bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Out
              </button>
            </div>
            <label className="flex flex-col text-xs text-zinc-600">
              Time
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={saveEdit}
              disabled={pending}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </section>

        {staff ? (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Override the day
            </h3>
            <p className="mb-2 text-[11px] text-zinc-500">
              Overrides win over computed status — mark present even with no punches, or
              absent even when the staff punched in.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOverride("present")}
                disabled={pending}
                className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                  status === "manual_present"
                    ? "bg-emerald-700 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Mark present
              </button>
              <button
                type="button"
                onClick={() => setOverride("absent")}
                disabled={pending}
                className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                  status === "manual_absent"
                    ? "bg-rose-700 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Mark absent
              </button>
              <button
                type="button"
                onClick={() => setOverride(null)}
                disabled={pending || (status !== "manual_present" && status !== "manual_absent")}
                className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear override
              </button>
            </div>
          </section>
        ) : null}

        {/* Dedicated destructive footer. Keeps Delete out of the Save row so the supervisor
            can't fat-finger it, and uses a two-step inline confirm instead of window.confirm
            (consistent with the rest of the app's styled modals). */}
        <section className="rounded-md border border-rose-200 bg-rose-50/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                Delete punch
              </h3>
              <p className="mt-0.5 text-[11px] text-rose-700/80">
                Removes this row only. Other punches and overrides are unaffected.
              </p>
            </div>
            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={pending}
                  className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={deletePunch}
                  disabled={pending}
                  className="rounded-md bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={pending}
                className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete this punch
              </button>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}

function formatTimeInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
