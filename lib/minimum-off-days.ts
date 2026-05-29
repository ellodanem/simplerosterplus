export const MINIMUM_OFF_DAYS_ENABLED_DEFAULT = true;
export const MINIMUM_OFF_DAYS_DEFAULT = 1;
export const MINIMUM_OFF_DAYS_MIN = 0;
export const MINIMUM_OFF_DAYS_MAX = 7;

export type MinimumOffDaysSettings = {
  enabled: boolean;
  minimumOffDays: number;
};

export function parseMinimumOffDaysEnabled(value: string | null | undefined): boolean {
  if (value == null || value === "") return MINIMUM_OFF_DAYS_ENABLED_DEFAULT;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return MINIMUM_OFF_DAYS_ENABLED_DEFAULT;
}

export function clampMinimumOffDays(days: number): number {
  if (!Number.isFinite(days)) return MINIMUM_OFF_DAYS_DEFAULT;
  const rounded = Math.round(days);
  return Math.min(MINIMUM_OFF_DAYS_MAX, Math.max(MINIMUM_OFF_DAYS_MIN, rounded));
}

export function isValidMinimumOffDays(days: number): boolean {
  if (!Number.isFinite(days)) return false;
  const rounded = Math.round(days);
  return rounded >= MINIMUM_OFF_DAYS_MIN && rounded <= MINIMUM_OFF_DAYS_MAX;
}

export function parseMinimumOffDays(value: string | null | undefined): number {
  if (value == null || value === "") return MINIMUM_OFF_DAYS_DEFAULT;
  return clampMinimumOffDays(Number(value));
}

/** Days without a scheduled shift (includes approved vacation / day off). */
export function countStaffOffDaysInWeek(
  staffId: string,
  days: string[],
  entries: Record<string, string>,
  blockMap: Record<string, "vacation" | "dayOff">,
  holidays: Record<string, { stationClosed: boolean }>,
): number {
  let off = 0;
  for (const ymd of days) {
    if (holidays[ymd]?.stationClosed) continue;
    const blocked = blockMap[`${staffId}__${ymd}`];
    const hasShift = !!entries[`${staffId}__${ymd}`];
    if (blocked || !hasShift) off++;
  }
  return off;
}

export function staffBelowMinimumOffDays(
  staffId: string,
  days: string[],
  entries: Record<string, string>,
  blockMap: Record<string, "vacation" | "dayOff">,
  holidays: Record<string, { stationClosed: boolean }>,
  settings: MinimumOffDaysSettings,
): boolean {
  if (!settings.enabled) return false;
  const offCount = countStaffOffDaysInWeek(staffId, days, entries, blockMap, holidays);
  return offCount < settings.minimumOffDays;
}

export function countStaffBelowMinimumOffDays(
  staffIds: string[],
  days: string[],
  entries: Record<string, string>,
  blockMap: Record<string, "vacation" | "dayOff">,
  holidays: Record<string, { stationClosed: boolean }>,
  settings: MinimumOffDaysSettings,
): number {
  if (!settings.enabled) return 0;
  return staffIds.filter((id) =>
    staffBelowMinimumOffDays(id, days, entries, blockMap, holidays, settings),
  ).length;
}

export function minimumOffDaysShortfallMessage(
  offCount: number,
  settings: MinimumOffDaysSettings,
): string {
  const needed = settings.minimumOffDays;
  const dayWord = needed === 1 ? "day" : "days";
  if (offCount === 0) {
    return `No days off this week (needs at least ${needed} ${dayWord})`;
  }
  return `${offCount} ${offCount === 1 ? "day" : "days"} off (needs at least ${needed} ${dayWord})`;
}
