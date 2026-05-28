import { startOfLocalDayUtc, weekStartAnchorYmd } from "@/lib/datetime-policy";

const NOON_MS = 12 * 3600_000;

const DMY_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
const D_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function dmyFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = DMY_FORMATTER_CACHE.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    DMY_FORMATTER_CACHE.set(timeZone, f);
  }
  return f;
}

function dFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = D_FORMATTER_CACHE.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "2-digit",
    });
    D_FORMATTER_CACHE.set(timeZone, f);
  }
  return f;
}

function formatDmy(instant: Date, timeZone: string): string {
  const parts = dmyFormatter(timeZone).formatToParts(instant);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  if (!day || !month || !year) return dmyFormatter(timeZone).format(instant).replaceAll(" ", "-");
  return `${day}-${month}-${year}`;
}

function formatD(instant: Date, timeZone: string): string {
  const parts = dFormatter(timeZone).formatToParts(instant);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  if (!day) return dFormatter(timeZone).format(instant);
  return day;
}

/** `YYYY-MM-DD` anchor of the current work week in `timeZone`. */
export function currentWeekStartYmd(timeZone: string, weekStartWeekday: number): string {
  return weekStartAnchorYmd(new Date(), timeZone, weekStartWeekday);
}

/** Anchor `YYYY-MM-DD` of the work week containing the local calendar day `ymd`. */
export function weekStartFromYmd(
  ymd: string,
  timeZone: string,
  weekStartWeekday: number,
): string {
  const local = startOfLocalDayUtc(ymd, timeZone);
  const noon = new Date(local.getTime() + NOON_MS);
  return weekStartAnchorYmd(noon, timeZone, weekStartWeekday);
}

/** Last calendar day of the work week (anchor + 6). */
export function weekEndYmd(anchorYmd: string): string {
  return shiftYmd(anchorYmd, 6);
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

/** Seven `YYYY-MM-DD` strings from anchor through anchor + 6. */
export function daysOfWeek(anchorYmd: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftYmd(anchorYmd, i));
}

/** Friendly column label for a `YYYY-MM-DD` (e.g. "Mon · May 11"). */
export function dayHeaderLabel(ymd: string, timeZone: string): { weekday: string; date: string } {
  const local = startOfLocalDayUtc(ymd, timeZone);
  const noon = new Date(local.getTime() + NOON_MS);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon);
  const date = formatDmy(noon, timeZone);
  return { weekday, date };
}

/** Like `dayHeaderLabel`, but shows only the day number (e.g. "01"). */
export function dayHeaderLabelCompact(
  ymd: string,
  timeZone: string,
): { weekday: string; date: string } {
  const local = startOfLocalDayUtc(ymd, timeZone);
  const noon = new Date(local.getTime() + NOON_MS);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon);
  const date = formatD(noon, timeZone);
  return { weekday, date };
}

/** `@db.Date` round-trips as midnight UTC. Read back the calendar components in UTC. */
export function ymdForDbDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
