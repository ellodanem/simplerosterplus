import { formatYmdInZone } from "@/lib/datetime-policy";
import { isPastRosterWeek } from "@/lib/roster-display-staff";
import { weekEndYmd } from "@/lib/roster-week";

/** Whether roster edits should be blocked (view-only). Uses org/location business calendar. */
export function isRosterWeekLocked(anchorYmd: string, timeZone: string, now = new Date()): boolean {
  const todayYmd = formatYmdInZone(now, timeZone);
  return isPastRosterWeek(weekEndYmd(anchorYmd), todayYmd);
}
