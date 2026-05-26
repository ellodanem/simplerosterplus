import { formatYmdInZone } from "@/lib/datetime-policy";
import { prisma } from "@/lib/prisma";

export type StaffArchiveFields = {
  archivedAt: Date | null;
};

export function isStaffArchived(staff: StaffArchiveFields): boolean {
  return staff.archivedAt != null;
}

/** True when `eventAt` may appear on this staff member's record (at or before archive). */
export function isStaffEventVisible(staff: StaffArchiveFields, eventAt: Date): boolean {
  if (!staff.archivedAt) return true;
  return eventAt.getTime() <= staff.archivedAt.getTime();
}

/** Calendar day `ymd` in `timeZone` is strictly after the archive instant's local day. */
export function isYmdAfterArchiveDay(
  ymd: string,
  archivedAt: Date,
  timeZone: string,
): boolean {
  return ymd > formatYmdInZone(archivedAt, timeZone);
}

/**
 * Attendance week grid: omit archived staff when the whole week starts after they left.
 */
export function includeStaffOnAttendanceWeek(
  staff: StaffArchiveFields,
  weekStartYmd: string,
  timeZone: string,
): boolean {
  if (!staff.archivedAt) return true;
  const archiveYmd = formatYmdInZone(staff.archivedAt, timeZone);
  return weekStartYmd <= archiveYmd;
}

export function allowStaffDeleteInDev(): boolean {
  if (process.env.ALLOW_STAFF_DELETE === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export type StaffDeleteCheck = { allowed: boolean; reason?: string };

export async function getStaffDeleteEligibilityMap(
  staff: Array<{ id: string; isTestUser: boolean }>,
): Promise<Map<string, StaffDeleteCheck>> {
  const result = new Map<string, StaffDeleteCheck>();
  if (staff.length === 0) return result;

  if (allowStaffDeleteInDev()) {
    for (const row of staff) result.set(row.id, { allowed: true });
    return result;
  }

  const testStaffIds = staff.filter((row) => row.isTestUser).map((row) => row.id);
  for (const row of staff) {
    if (!row.isTestUser) {
      result.set(row.id, {
        allowed: false,
        reason: "Only test accounts can be deleted. Archive real staff instead.",
      });
    }
  }
  if (testStaffIds.length === 0) return result;

  const linkedStaffIds = new Set<string>();
  const linkedGroups = await Promise.all([
    prisma.rosterEntry.groupBy({
      by: ["staffId"],
      where: { staffId: { in: testStaffIds } },
      _count: { _all: true },
    }),
    prisma.attendanceLog.groupBy({
      by: ["staffId"],
      where: { staffId: { in: testStaffIds } },
      _count: { _all: true },
    }),
    prisma.staffVacation.groupBy({
      by: ["staffId"],
      where: { staffId: { in: testStaffIds } },
      _count: { _all: true },
    }),
    prisma.staffDayOff.groupBy({
      by: ["staffId"],
      where: { staffId: { in: testStaffIds } },
      _count: { _all: true },
    }),
    prisma.staffSickLeave.groupBy({
      by: ["staffId"],
      where: { staffId: { in: testStaffIds } },
      _count: { _all: true },
    }),
    prisma.attendanceDayOverride.groupBy({
      by: ["staffId"],
      where: { staffId: { in: testStaffIds } },
      _count: { _all: true },
    }),
  ]);

  for (const groups of linkedGroups) {
    for (const row of groups) {
      if (row.staffId && row._count._all > 0) linkedStaffIds.add(row.staffId);
    }
  }

  for (const staffId of testStaffIds) {
    if (linkedStaffIds.has(staffId)) {
      result.set(staffId, {
        allowed: false,
        reason: "This test account has roster or attendance data and cannot be deleted.",
      });
    } else {
      result.set(staffId, { allowed: true });
    }
  }

  return result;
}

/** True when the staff row has no roster, attendance, or leave records. */
export async function staffHasZeroLinkedData(staffId: string): Promise<boolean> {
  const [
    rosterEntries,
    punches,
    vacations,
    dayOffs,
    sickLeaves,
    overrides,
  ] = await Promise.all([
    prisma.rosterEntry.count({ where: { staffId } }),
    prisma.attendanceLog.count({ where: { staffId } }),
    prisma.staffVacation.count({ where: { staffId } }),
    prisma.staffDayOff.count({ where: { staffId } }),
    prisma.staffSickLeave.count({ where: { staffId } }),
    prisma.attendanceDayOverride.count({ where: { staffId } }),
  ]);
  return (
    rosterEntries +
      punches +
      vacations +
      dayOffs +
      sickLeaves +
      overrides ===
    0
  );
}

export async function canDeleteStaff(args: {
  staffId: string;
  isTestUser: boolean;
}): Promise<StaffDeleteCheck> {
  if (allowStaffDeleteInDev()) {
    return { allowed: true };
  }
  if (!args.isTestUser) {
    return {
      allowed: false,
      reason: "Only test accounts can be deleted. Archive real staff instead.",
    };
  }
  const zero = await staffHasZeroLinkedData(args.staffId);
  if (!zero) {
    return {
      allowed: false,
      reason: "This test account has roster or attendance data and cannot be deleted.",
    };
  }
  return { allowed: true };
}
