import { dayHeaderLabel } from "@/lib/roster-week";
import { ymdFromDate } from "@/lib/staff-input";

function monthDayFromYmd(ymd: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  return `${match[2]}-${match[3]}`;
}

/** Return the roster day (`YYYY-MM-DD`) in `weekDays` that matches a staff birthday, if any. */
export function birthdayYmdInWeek(
  dateOfBirthYmd: string,
  weekDays: string[],
): string | null {
  const birthMonthDay = monthDayFromYmd(dateOfBirthYmd);
  if (!birthMonthDay) return null;
  for (const ymd of weekDays) {
    if (monthDayFromYmd(ymd) === birthMonthDay) return ymd;
  }
  return null;
}

export function buildBirthdayByStaffId(
  staff: Array<{ id: string; dateOfBirth: Date | null }>,
  weekDays: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const member of staff) {
    const dobYmd = ymdFromDate(member.dateOfBirth);
    const birthdayYmd = birthdayYmdInWeek(dobYmd, weekDays);
    if (birthdayYmd) out[member.id] = birthdayYmd;
  }
  return out;
}

export function birthdayLabel(ymd: string, timeZone: string): string {
  const header = dayHeaderLabel(ymd, timeZone);
  return `${header.weekday} ${header.date}`;
}
