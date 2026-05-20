/**
 * Calendar helpers keyed by an explicit IANA timezone (per organization).
 * Callers pass `timeZone` from `Organization.timeZone` — there is no fixed app-wide zone.
 */

/** Scan step for local-midnight resolution (DST-safe enough for roster dates). */
const STEP_MS = 60 * 1000;

const YMD_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function ymdFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = YMD_FORMATTER_CACHE.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    YMD_FORMATTER_CACHE.set(timeZone, f);
  }
  return f;
}

/** `YYYY-MM-DD` for the instant `d` as seen in `timeZone`. */
export function formatYmdInZone(d: Date, timeZone: string): string {
  return ymdFormatter(timeZone).format(d);
}

/** Midnight UTC for a calendar `YYYY-MM-DD` (for Prisma `@db.Date` round-trip only). */
export function utcDateFromYmd(ymd: string): Date {
  const [y, m, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

/**
 * Parses `YYYY-MM-DD` as the start of that local calendar day in `timeZone`,
 * returned as a UTC `Date` suitable for comparisons with UTC-stored instants.
 */
export function startOfLocalDayUtc(ymd: string, timeZone: string): Date {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid YMD: ${ymd}`);
  }
  const [y, mo, d] = parts as [number, number, number];
  const startProbe = Date.UTC(y, mo - 1, d - 1, 0, 0, 0, 0);
  const endProbe = Date.UTC(y, mo - 1, d + 2, 0, 0, 0, 0);
  let minMs: number | null = null;
  for (let t = startProbe; t < endProbe; t += STEP_MS) {
    if (formatYmdInZone(new Date(t), timeZone) === ymd) {
      minMs = minMs === null ? t : Math.min(minMs, t);
    }
  }
  if (minMs === null) {
    throw new Error(`Could not resolve local day for ${ymd} in ${timeZone}`);
  }
  return new Date(minMs);
}

const LOCAL_WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Local calendar day that starts the work week containing `d`, as `YYYY-MM-DD` in `timeZone`.
 * `weekStartWeekday` uses JavaScript convention: 0 = Sunday … 6 = Saturday.
 */
export function weekStartAnchorYmd(
  d: Date,
  timeZone: string,
  weekStartWeekday: number,
): string {
  if (!Number.isInteger(weekStartWeekday) || weekStartWeekday < 0 || weekStartWeekday > 6) {
    throw new Error(`weekStartWeekday must be 0–6, got ${weekStartWeekday}`);
  }
  const ymd = formatYmdInZone(d, timeZone);
  const dayStart = startOfLocalDayUtc(ymd, timeZone);
  const dowShort = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(dayStart);
  const dow = LOCAL_WEEKDAY_TO_INDEX[dowShort];
  if (dow === undefined) {
    throw new Error(`Unexpected weekday: ${dowShort}`);
  }
  const daysBack = (dow - weekStartWeekday + 7) % 7;
  const anchorMs = dayStart.getTime() - daysBack * 86_400_000;
  return formatYmdInZone(new Date(anchorMs), timeZone);
}

/** Monday-start week containing `d` (convenience wrapper). */
export function weekStartMondayYmd(d: Date, timeZone: string): string {
  return weekStartAnchorYmd(d, timeZone, 1);
}
