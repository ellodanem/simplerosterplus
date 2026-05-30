import type { AttendanceStaff } from "./attendance-week";

export function isArchivedAttendanceStaff(staff: Pick<AttendanceStaff, "archivedAt">): boolean {
  return staff.archivedAt != null;
}

/** Active staff by default; include archived when auditing. */
export function filterStaffForAttendanceDisplay<T extends Pick<AttendanceStaff, "archivedAt">>(
  staff: T[],
  showArchivedStaff: boolean,
): T[] {
  if (showArchivedStaff) return staff;
  return staff.filter((s) => !isArchivedAttendanceStaff(s));
}

/** Active first, then alphabetical by last name. */
export function sortStaffForAttendanceRail<
  T extends Pick<AttendanceStaff, "archivedAt" | "lastName" | "firstName">,
>(staff: T[]): T[] {
  return [...staff].sort((a, b) => {
    const aArchived = isArchivedAttendanceStaff(a);
    const bArchived = isArchivedAttendanceStaff(b);
    if (aArchived !== bArchived) return aArchived ? 1 : -1;
    const ln = a.lastName.localeCompare(b.lastName);
    if (ln !== 0) return ln;
    return a.firstName.localeCompare(b.firstName);
  });
}
