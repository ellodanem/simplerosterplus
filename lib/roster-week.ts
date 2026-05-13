import { startOfLocalDayUtc, weekStartMondayYmd } from "@/lib/datetime-policy";

const NOON_MS = 12 * 3600_000;

/** `YYYY-MM-DD` Monday of the current week in `timeZone`. */
export function currentWeekStartYmd(timeZone: string): string {
  return weekStartMondayYmd(new Date(), timeZone);
}

/** Monday `YYYY-MM-DD` of the week containing the local calendar day `ymd`. */
export function weekStartFromYmd(ymd: string, timeZone: string): string {
  const local = startOfLocalDayUtc(ymd, timeZone);
  const noon = new Date(local.getTime() + NOON_MS);
  return weekStartMondayYmd(noon, timeZone);
}

/** Add or subtract whole days from a `YYYY-MM-DD` value (UTC arithmetic). */
export function shiftYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return [
    dt.getUTCFullYear(),
    String(dt.getUTCMonth() + 1).padStart(2, "0"),
    String(dt.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** Seven `YYYY-MM-DD` strings, Monday → Sunday, starting at `mondayYmd`. */
export function daysOfWeek(mondayYmd: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftYmd(mondayYmd, i));
}

/** Friendly column label for a `YYYY-MM-DD` (e.g. "Mon · May 11"). */
export function dayHeaderLabel(ymd: string, timeZone: string): { weekday: string; date: string } {
  const local = startOfLocalDayUtc(ymd, timeZone);
  const noon = new Date(local.getTime() + NOON_MS);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon);
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(noon);
  return { weekday, date };
}

/** `@db.Date` round-trips as midnight UTC. Read back the calendar components in UTC. */
export function ymdForDbDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
