import { formatYmdInZone } from "@/lib/datetime-policy";
import { isPastRosterWeek } from "@/lib/roster-display-staff";
import { daysOfWeek, weekEndYmd } from "@/lib/roster-week";

export type RosterLockOptions = {
  /** True when this week was shared at least once (shareToken is set). */
  everPublished: boolean;
};

/** Build lock options from a roster week's share token. */
export function rosterLockFromShareToken(
  shareToken: string | null | undefined,
): RosterLockOptions {
  return { everPublished: shareToken != null };
}

/** Whether the entire roster week is read-only (past work week). */
export function isRosterWeekLocked(
  anchorYmd: string,
  timeZone: string,
  lock: RosterLockOptions,
  now = new Date(),
): boolean {
  if (!lock.everPublished) return false;
  const todayYmd = formatYmdInZone(now, timeZone);
  return isPastRosterWeek(weekEndYmd(anchorYmd), todayYmd);
}

/**
 * Whether a single calendar day in a roster week is locked for roster edits.
 * Draft weeks that were never shared stay fully editable.
 * - Past week: all days locked (when ever published)
 * - Future week: none locked
 * - Current week: today and earlier locked (when ever published)
 */
export function isRosterDayLocked(
  ymd: string,
  anchorYmd: string,
  todayYmd: string,
  lock: RosterLockOptions,
): boolean {
  if (!lock.everPublished) return false;
  const weekEnd = weekEndYmd(anchorYmd);
  if (todayYmd >= weekEnd) return true;
  if (todayYmd < anchorYmd) return false;
  return ymd <= todayYmd;
}

/** True when viewing the in-progress work week (some days may be locked, some editable). */
export function isCurrentRosterWeek(anchorYmd: string, todayYmd: string): boolean {
  return todayYmd >= anchorYmd && todayYmd < weekEndYmd(anchorYmd);
}

export function rosterLockedDays(
  anchorYmd: string,
  todayYmd: string,
  lock: RosterLockOptions,
): string[] {
  return daysOfWeek(anchorYmd).filter((ymd) => isRosterDayLocked(ymd, anchorYmd, todayYmd, lock));
}

export function rosterUnlockedDays(
  anchorYmd: string,
  todayYmd: string,
  lock: RosterLockOptions,
): string[] {
  return daysOfWeek(anchorYmd).filter((ymd) => !isRosterDayLocked(ymd, anchorYmd, todayYmd, lock));
}
