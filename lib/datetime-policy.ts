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

/** Monday 00:00 local of the week containing `d`, as `YYYY-MM-DD` in `timeZone`. */
export function weekStartMondayYmd(d: Date, timeZone: string): string {
  const ymd = formatYmdInZone(d, timeZone);
  const dayStart = startOfLocalDayUtc(ymd, timeZone);
  const dow = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(dayStart);
  const delta: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const n = delta[dow];
  if (n === undefined) {
    throw new Error(`Unexpected weekday: ${dow}`);
  }
  const mondayMs = dayStart.getTime() - n * 86400000;
  return formatYmdInZone(new Date(mondayMs), timeZone);
}
