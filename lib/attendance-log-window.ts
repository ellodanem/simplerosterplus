export const DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS = 7;
export const EXPANDED_ATTENDANCE_LOG_WINDOW_DAYS = 120;

export function isExpandedAttendanceLog(allParam: string | null | undefined): boolean {
  return allParam === "1";
}

export function getAttendanceLogWindowDays(allParam: string | null | undefined): number {
  return isExpandedAttendanceLog(allParam)
    ? EXPANDED_ATTENDANCE_LOG_WINDOW_DAYS
    : DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS;
}
