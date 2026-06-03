import Holidays from "date-holidays";
import type { Prisma } from "@prisma/client";
import { utcDateFromYmd } from "@/lib/datetime-policy";
import { ymdForDbDate } from "@/lib/roster-week";

export const HOLIDAY_SOURCE_MANUAL = "manual";
export const HOLIDAY_SOURCE_CALENDAR = "country_calendar";

export const HOLIDAY_SYNC_START_YEAR_OFFSET = -1;
export const HOLIDAY_SYNC_END_YEAR_OFFSET = 5;

export type HolidayOption = {
  code: string;
  name: string;
};

export type HolidayCalendarSyncResult = {
  years: number[];
  importedCount: number;
  removedCount: number;
  manualOverrideCount: number;
};

const IMPORT_TYPES = new Set(["public", "bank"]);
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Overrides where `date-holidays` dates/names disagree with observed St. Lucia holidays. */
const COUNTRY_HOLIDAY_PATCHES: Record<
  string,
  Array<{
    year: number;
    removeYmds: string[];
    add: Array<{ ymd: string; name: string }>;
  }>
> = {
  LC: [
    {
      year: 2026,
      // Library: 2026-07-10 "Carnival". Observed: 20 Jul (public holiday), 21 Jul (half day).
      removeYmds: ["2026-07-10"],
      add: [
        { ymd: "2026-07-20", name: "Carnival" },
        { ymd: "2026-07-21", name: "Carnival (half day)" },
      ],
    },
  ],
};

let cachedCountries: HolidayOption[] | null = null;
const subdivisionCache = new Map<string, HolidayOption[]>();

export function getHolidaySyncYears(baseYear = new Date().getFullYear()): number[] {
  const years: number[] = [];
  for (
    let year = baseYear + HOLIDAY_SYNC_START_YEAR_OFFSET;
    year <= baseYear + HOLIDAY_SYNC_END_YEAR_OFFSET;
    year++
  ) {
    years.push(year);
  }
  return years;
}

export function listHolidayCountries(): HolidayOption[] {
  if (cachedCountries) return cachedCountries;
  const hd = new Holidays();
  cachedCountries = mapOptions(hd.getCountries("en"));
  return cachedCountries;
}

export function listHolidaySubdivisions(countryCode: string): HolidayOption[] {
  const normalizedCountry = countryCode.trim().toUpperCase();
  if (!normalizedCountry) return [];
  const cached = subdivisionCache.get(normalizedCountry);
  if (cached) return cached;
  const hd = new Holidays();
  const options = mapOptions(hd.getStates(normalizedCountry, "en"));
  subdivisionCache.set(normalizedCountry, options);
  return options;
}

export function resolveHolidayCountryCode(input: string | null | undefined): string | null {
  return resolveOptionCode(input, listHolidayCountries());
}

export function resolveHolidaySubdivisionCode(
  countryCode: string,
  input: string | null | undefined,
): string | null {
  return resolveOptionCode(input, listHolidaySubdivisions(countryCode));
}

export async function syncHolidayCalendarForLocation(
  tx: Prisma.TransactionClient,
  args: {
    organizationId: string;
    locationId: string;
    countryCode: string | null;
    subdivisionCode: string | null;
  },
): Promise<HolidayCalendarSyncResult> {
  const { organizationId, locationId, countryCode, subdivisionCode } = args;

  if (!countryCode) {
    const removed = await tx.publicHoliday.deleteMany({
      where: { locationId, source: HOLIDAY_SOURCE_CALENDAR },
    });
    return {
      years: [],
      importedCount: 0,
      removedCount: removed.count,
      manualOverrideCount: 0,
    };
  }

  const years = getHolidaySyncYears();
  const imported = buildImportedHolidays(countryCode, subdivisionCode, years);

  const manualRows = await tx.publicHoliday.findMany({
    where: {
      locationId,
      source: HOLIDAY_SOURCE_MANUAL,
      date: {
        gte: utcDateFromYmd(`${years[0]}-01-01`),
        lte: utcDateFromYmd(`${years[years.length - 1]}-12-31`),
      },
    },
    select: { date: true },
  });
  const existingImported = await tx.publicHoliday.findMany({
    where: { locationId, source: HOLIDAY_SOURCE_CALENDAR },
    select: { date: true, stationClosed: true },
  });

  const removed = await tx.publicHoliday.deleteMany({
    where: { locationId, source: HOLIDAY_SOURCE_CALENDAR },
  });

  const manualYmds = new Set(manualRows.map((row) => ymdForDbDate(row.date)));
  const priorStationClosedByYmd = new Map(
    existingImported.map((row) => [ymdForDbDate(row.date), row.stationClosed] as const),
  );

  const createData = imported
    .filter((row) => !manualYmds.has(row.date))
    .map((row) => ({
      organizationId,
      locationId,
      date: utcDateFromYmd(row.date),
      name: row.name,
      source: HOLIDAY_SOURCE_CALENDAR,
      stationClosed: priorStationClosedByYmd.get(row.date) ?? false,
    }));

  if (createData.length > 0) {
    await tx.publicHoliday.createMany({ data: createData });
  }

  return {
    years,
    importedCount: createData.length,
    removedCount: removed.count,
    manualOverrideCount: imported.length - createData.length,
  };
}

function applyCountryHolidayPatches(
  countryCode: string,
  namesByYmd: Map<string, Set<string>>,
  years: number[],
): void {
  const patches = COUNTRY_HOLIDAY_PATCHES[countryCode.trim().toUpperCase()];
  if (!patches) return;
  const yearSet = new Set(years);
  for (const patch of patches) {
    if (!yearSet.has(patch.year)) continue;
    for (const ymd of patch.removeYmds) namesByYmd.delete(ymd);
    for (const { ymd, name } of patch.add) {
      if (!YMD_RE.test(ymd)) continue;
      namesByYmd.set(ymd, new Set([name]));
    }
  }
}

function mapOptions(input: Record<string, string> | undefined): HolidayOption[] {
  return Object.entries(input ?? {})
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

function resolveOptionCode(
  input: string | null | undefined,
  options: HolidayOption[],
): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;
  const lowered = value.toLowerCase();
  return options.find((option) => option.code.toLowerCase() === lowered)?.code ?? null;
}

function buildImportedHolidays(
  countryCode: string,
  subdivisionCode: string | null,
  years: number[],
): Array<{ date: string; name: string }> {
  const hd = new Holidays();
  if (subdivisionCode) hd.init(countryCode, subdivisionCode, { types: ["public", "bank"] });
  else hd.init(countryCode, { types: ["public", "bank"] });

  const namesByYmd = new Map<string, Set<string>>();

  for (const year of years) {
    for (const holiday of hd.getHolidays(year, "en")) {
      if (!IMPORT_TYPES.has(holiday.type)) continue;
      const ymd = holiday.date.slice(0, 10);
      if (!YMD_RE.test(ymd)) continue;
      const name = holiday.name.replace(/\s+/g, " ").trim();
      if (!name) continue;
      const existing = namesByYmd.get(ymd);
      if (existing) existing.add(name);
      else namesByYmd.set(ymd, new Set([name]));
    }
  }

  applyCountryHolidayPatches(countryCode, namesByYmd, years);

  return Array.from(namesByYmd.entries())
    .map(([date, names]) => ({
      date,
      name: Array.from(names).sort((a, b) => a.localeCompare(b, "en")).join(" / "),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
