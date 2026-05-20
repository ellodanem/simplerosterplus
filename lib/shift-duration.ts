/** Parse HH:mm (24-hour) to minutes since midnight. */
export function parseHHmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Gross scheduled length in minutes (supports overnight end < start). */
export function grossShiftMinutes(startTime: string, endTime: string): number {
  const start = parseHHmmToMinutes(startTime);
  const end = parseHHmmToMinutes(endTime);
  if (end <= start) return 24 * 60 - start + end;
  return end - start;
}

export function paidShiftMinutes(
  startTime: string,
  endTime: string,
  unpaidBreakMinutes: number,
): number {
  return Math.max(0, grossShiftMinutes(startTime, endTime) - unpaidBreakMinutes);
}

const MAX_UNPAID_BREAK_MINUTES = 480;

export function parseUnpaidBreakMinutes(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return 0;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 0) return null;
  if (n > MAX_UNPAID_BREAK_MINUTES) return null;
  return n;
}

export function validateUnpaidBreak(
  startTime: string,
  endTime: string,
  unpaidBreakMinutes: number,
): string | null {
  if (!Number.isInteger(unpaidBreakMinutes) || unpaidBreakMinutes < 0) {
    return "unpaidBreakMinutes must be a non-negative integer";
  }
  if (unpaidBreakMinutes > MAX_UNPAID_BREAK_MINUTES) {
    return `unpaidBreakMinutes cannot exceed ${MAX_UNPAID_BREAK_MINUTES}`;
  }
  const gross = grossShiftMinutes(startTime, endTime);
  if (unpaidBreakMinutes >= gross) {
    return "Unpaid break must be shorter than the shift length";
  }
  return null;
}

/** Human label for roster UI, e.g. "15 min" or "1 hr". */
export function formatBreakMinutes(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes % 60 === 0) return minutes === 60 ? "1 hr" : `${minutes / 60} hr`;
  if (minutes > 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} hr ${m} min`;
  }
  return `${minutes} min`;
}
