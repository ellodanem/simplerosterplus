/**
 * Pure presence math: given everything we know about a single (staff, calendar-day) cell,
 * decide what to render.
 *
 * Deliberately no prisma imports — the caller assembles the inputs and calls this once per
 * cell. Keeps the helper testable and the per-page cost bounded by the precomputation, not
 * by N+1 queries.
 *
 * Precedence (high → low): station_closed > on_vacation > day_off > manual_* > exempt
 * > (expected ? present|late|absent : no_shift).
 */

import { startOfLocalDayUtc } from "./datetime-policy";

export type PresenceStatus =
  | "no_shift"
  | "station_closed"
  | "on_vacation"
  | "day_off"
  | "exempt"
  | "manual_present"
  | "manual_absent"
  | "present"
  | "late"
  | "absent";

export type Punch = {
  punchAt: Date;
  punchType: "in" | "out";
};

export type ExpectedShift = {
  /** HH:mm local clock string, as stored on `ShiftTemplate.startTime`. */
  startHHmm: string;
  /** HH:mm local clock string, as stored on `ShiftTemplate.endTime`. */
  endHHmm: string;
};

export type ComputePresenceInput = {
  /** Calendar day this cell represents, YYYY-MM-DD in `timeZone`. */
  dateYmd: string;
  /** IANA zone the calendar day is interpreted in. */
  timeZone: string;
  /** ShiftTemplate associated with that day's RosterEntry, if any. */
  expected: ExpectedShift | null;
  vacation: boolean;
  dayOff: boolean;
  stationClosed: boolean;
  punchExempt: boolean;
  override: "present" | "absent" | null;
  punches: Punch[];
  /** Minutes after the shift start before we flip from `present` → `late`. */
  graceMinutes: number;
};

export type PresenceResult = {
  status: PresenceStatus;
  /** Earliest `in` punch on this day, or null. */
  firstInAt: Date | null;
  /** Latest `out` punch on this day, or null. */
  lastOutAt: Date | null;
  /**
   * Whole minutes between the expected start (+ grace) and the first in-punch, when both
   * exist and the punch is after start+grace. Null otherwise (including for early/on-time
   * arrivals — they're just `present`, not negatively late).
   */
  minutesLate: number | null;
};

const HHMM_RE = /^(\d{2}):(\d{2})$/;

/**
 * Resolve an HH:mm local clock time on a YYYY-MM-DD calendar day in `timeZone` to a UTC
 * instant. Wraps `startOfLocalDayUtc` and adds the minutes-of-day; DST-safe because the
 * underlying helper uses a probe scan against `Intl.DateTimeFormat`.
 */
function localTimeToUtc(ymd: string, hhmm: string, timeZone: string): Date | null {
  const m = HHMM_RE.exec(hhmm);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const dayStart = startOfLocalDayUtc(ymd, timeZone);
  return new Date(dayStart.getTime() + (hours * 60 + minutes) * 60_000);
}

export function computePresence(input: ComputePresenceInput): PresenceResult {
  const sortedPunches = [...input.punches].sort(
    (a, b) => a.punchAt.getTime() - b.punchAt.getTime(),
  );
  const firstInAt = sortedPunches.find((p) => p.punchType === "in")?.punchAt ?? null;
  const lastOutAt =
    [...sortedPunches].reverse().find((p) => p.punchType === "out")?.punchAt ?? null;

  if (input.stationClosed) {
    return { status: "station_closed", firstInAt, lastOutAt, minutesLate: null };
  }
  if (input.vacation) {
    return { status: "on_vacation", firstInAt, lastOutAt, minutesLate: null };
  }
  if (input.dayOff) {
    return { status: "day_off", firstInAt, lastOutAt, minutesLate: null };
  }
  if (input.override === "present") {
    return { status: "manual_present", firstInAt, lastOutAt, minutesLate: null };
  }
  if (input.override === "absent") {
    return { status: "manual_absent", firstInAt, lastOutAt, minutesLate: null };
  }
  if (input.punchExempt && input.expected) {
    return { status: "exempt", firstInAt, lastOutAt, minutesLate: null };
  }

  if (!input.expected) {
    return { status: "no_shift", firstInAt, lastOutAt, minutesLate: null };
  }

  if (!firstInAt) {
    return { status: "absent", firstInAt, lastOutAt, minutesLate: null };
  }

  const startUtc = localTimeToUtc(input.dateYmd, input.expected.startHHmm, input.timeZone);
  if (!startUtc) {
    return { status: "present", firstInAt, lastOutAt, minutesLate: null };
  }
  const graceMs = Math.max(0, input.graceMinutes) * 60_000;
  const lateThresholdMs = startUtc.getTime() + graceMs;

  if (firstInAt.getTime() <= lateThresholdMs) {
    return { status: "present", firstInAt, lastOutAt, minutesLate: null };
  }

  const minutesLate = Math.round((firstInAt.getTime() - lateThresholdMs) / 60_000);
  return { status: "late", firstInAt, lastOutAt, minutesLate };
}

/** Display label used by both the grid pill and the punch-log status column. */
export function presenceLabel(status: PresenceStatus): string {
  switch (status) {
    case "no_shift": return "No shift";
    case "station_closed": return "Closed";
    case "on_vacation": return "Vacation";
    case "day_off": return "Day off";
    case "exempt": return "Exempt";
    case "manual_present": return "Present (manual)";
    case "manual_absent": return "Absent (manual)";
    case "present": return "Present";
    case "late": return "Late";
    case "absent": return "Absent";
  }
}

/**
 * Single-letter glyph used inside the grid cell. Pairs with color so cells are readable
 * without relying on color alone (accessibility) and stay scannable at a glance.
 */
export function presenceGlyph(status: PresenceStatus): string {
  switch (status) {
    case "no_shift": return "—";
    case "station_closed": return "C";
    case "on_vacation": return "V";
    case "day_off": return "O";
    case "exempt": return "E";
    case "manual_present": return "M";
    case "manual_absent": return "X";
    case "present": return "P";
    case "late": return "L";
    case "absent": return "A";
  }
}

/**
 * Tailwind background + text classes for the cell glyph. Kept here (not in the React file)
 * so the log drawer can reuse the same vocabulary.
 *
 * Grid intent:
 *   - green for "ok" (present, manual present)
 *   - amber for "needs eyes" (late)
 *   - rose for "bad" (absent, manual absent)
 *   - zinc for "n/a today" (no_shift, closed, vacation, day off)
 *   - violet for "exempt"
 */
export function presenceClasses(status: PresenceStatus): {
  /** Filled square / pill background + text. */
  solid: string;
  /** Soft cell background, used as a subtle row tint behind the glyph. */
  soft: string;
} {
  switch (status) {
    case "present":
      return { solid: "bg-emerald-600 text-white", soft: "bg-emerald-50" };
    case "manual_present":
      return { solid: "bg-emerald-700 text-white", soft: "bg-emerald-50" };
    case "late":
      return { solid: "bg-amber-500 text-white", soft: "bg-amber-50" };
    case "absent":
      return { solid: "bg-rose-600 text-white", soft: "bg-rose-50" };
    case "manual_absent":
      return { solid: "bg-rose-700 text-white", soft: "bg-rose-50" };
    case "exempt":
      return { solid: "bg-violet-600 text-white", soft: "bg-violet-50" };
    case "on_vacation":
      return { solid: "bg-sky-600 text-white", soft: "bg-sky-50" };
    case "day_off":
      return { solid: "bg-sky-500 text-white", soft: "bg-sky-50" };
    case "station_closed":
      return { solid: "bg-zinc-500 text-white", soft: "bg-zinc-100" };
    case "no_shift":
      return { solid: "bg-zinc-300 text-zinc-700", soft: "" };
  }
}

/**
 * Statuses that warrant supervisor attention this week. Drives the "N irregularities"
 * KPI chip in the page header. Late counts; absent counts; manual_absent does NOT count
 * because the supervisor has already weighed in.
 */
export function isIrregular(status: PresenceStatus): boolean {
  return status === "late" || status === "absent";
}
