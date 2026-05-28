import { formatYmdInZone } from "@/lib/datetime-policy";
import { isPastRosterWeek } from "@/lib/roster-display-staff";
import { daysOfWeek, weekEndYmd } from "@/lib/roster-week";

/** Whether the entire roster week is read-only (past work week). */
export function isRosterWeekLocked(anchorYmd: string, timeZone: string, now = new Date()): boolean {
  const todayYmd = formatYmdInZone(now, timeZone);
  return isPastRosterWeek(weekEndYmd(anchorYmd), todayYmd);
}

/**
 * Whether a single calendar day in a roster week is locked for roster edits.
 * - Past week: all days locked
 * - Future week: none locked
 * - Current week: today and earlier locked
 */
export function isRosterDayLocked(
  ymd: string,
  anchorYmd: string,
  todayYmd: string,
): boolean {
  const weekEnd = weekEndYmd(anchorYmd);
  if (todayYmd >= weekEnd) return true;
  if (todayYmd < anchorYmd) return false;
  return ymd <= todayYmd;
}

/** True when viewing the in-progress work week (some days may be locked, some editable). */
export function isCurrentRosterWeek(anchorYmd: string, todayYmd: string): boolean {
  return todayYmd >= anchorYmd && todayYmd < weekEndYmd(anchorYmd);
}

export function rosterLockedDays(anchorYmd: string, todayYmd: string): string[] {
  return daysOfWeek(anchorYmd).filter((ymd) => isRosterDayLocked(ymd, anchorYmd, todayYmd));
}

export function rosterUnlockedDays(anchorYmd: string, todayYmd: string): string[] {
  return daysOfWeek(anchorYmd).filter((ymd) => !isRosterDayLocked(ymd, anchorYmd, todayYmd));
}
