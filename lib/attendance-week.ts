/**
 * Server-side assembler for the /attendance page. Pulls every input the presence helper
 * needs for one (location, week) in a single `Promise.all`, then folds them into a
 * per-cell record keyed `${staffId}__${ymd}` — same convention as the roster grid.
 *
 * The page calls this once on render and hands the result to the client grid. The grid
 * never re-queries the server for cell math; it just calls the per-cell mutation routes
 * and refreshes on success.
 */

import { prisma } from "./prisma";
import { formatYmdInZone, utcDateFromYmd } from "./datetime-policy";
import {
  includeStaffOnAttendanceWeek,
  isStaffEventVisible,
  isYmdAfterArchiveDay,
} from "@/lib/staff-archive";
import { daysOfWeek, shiftYmd, ymdForDbDate } from "./roster-week";
import { getApprovedBlockMap } from "./leave-blocks";
import {
  computePresence,
  type PresenceStatus,
  type Punch,
  isIrregular,
} from "./attendance-policy";

/** Settings key in `AppSetting` for the per-org late-tolerance window in minutes. */
export const GRACE_KEY = "attendance_grace_minutes";
export const GRACE_DEFAULT = 10;
/** Hard cap so a typo in `AppSetting` can't break the layout (e.g. classify everyone as present). */
export const GRACE_MAX = 240;

export type AttendanceStaff = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  departmentName: string | null;
  punchExempt: boolean;
  /** ISO instant when archived, or null if active. */
  archivedAt: string | null;
};

/** Mirrors the `PunchVerifyMethod` Prisma enum. Kept as a string union so client
 *  components don't need to import Prisma types directly. */
export type PunchVerifyMethod =
  | "fingerprint"
  | "face"
  | "card"
  | "password"
  | "palm"
  | "other";

export type SerializedPunch = {
  id: string;
  staffId: string | null;
  /** Terminal user id when the punch is unmapped or for device-sourced rows. */
  deviceUserId: string | null;
  punchAt: string;
  punchType: "in" | "out";
  source: "manual" | "device_adms" | "device_pull";
  /** How the staff verified at the device. Null for manual punches and for device
   *  punches with no recognized verify mode. */
  verifyMethod: PunchVerifyMethod | null;
  note: string | null;
  corrected: boolean;
  originalPunchAt: string | null;
};

export type SerializedOverride = {
  id: string;
  staffId: string;
  date: string;
  status: "present" | "absent";
  lateReason: string | null;
  note: string | null;
};

/**
 * Wire-shape cell — only the fields the client actually reads. The full `PresenceResult`
 * has `Date` fields (firstInAt / lastOutAt) which we leave on the server so they don't
 * silently turn into strings when Next.js serializes server→client props.
 */
export type AttendanceCell = {
  status: PresenceStatus;
  minutesLate: number | null;
  staffId: string;
  ymd: string;
  punchIds: string[];
};

export type AttendanceWeekData = {
  graceMinutes: number;
  staff: AttendanceStaff[];
  days: string[];
  holidays: Record<string, { name: string; stationClosed: boolean }>;
  blockMap: Record<string, "vacation" | "dayOff">;
  /** All punches for the week, in time order. Used by both the grid and the log drawer. */
  punches: SerializedPunch[];
  overrides: SerializedOverride[];
  /** Roster entries `${staffId}__${ymd}` -> { shiftTemplate startHHmm/endHHmm }. */
  expectedByCell: Record<string, { startHHmm: string; endHHmm: string }>;
  /** Computed presence per `${staffId}__${ymd}` cell. */
  cells: Record<string, AttendanceCell>;
  /** Count of cells with `isIrregular(...)` true. Drives the header KPI chip. */
  irregularCount: number;
  /** Per-staff irregular counts for the right rail. */
  irregularByStaff: Record<string, number>;
};

/**
 * Read the org's grace setting once. Defaults to {@link GRACE_DEFAULT} when missing or
 * unparseable; clamps anything > {@link GRACE_MAX} so a bad row can't silently swallow
 * every late punch.
 */
export async function getGraceMinutes(organizationId: string): Promise<number> {
  const row = await prisma.appSetting.findUnique({
    where: { organizationId_key: { organizationId, key: GRACE_KEY } },
    select: { value: true },
  });
  if (!row) return GRACE_DEFAULT;
  const n = Number(row.value);
  if (!Number.isFinite(n) || n < 0) return GRACE_DEFAULT;
  return Math.min(GRACE_MAX, Math.round(n));
}

export async function getAttendanceWeekData(args: {
  organizationId: string;
  locationId: string;
  weekStartYmd: string;
  timeZone: string;
}): Promise<AttendanceWeekData> {
  const { organizationId, locationId, weekStartYmd, timeZone } = args;
  const days = daysOfWeek(weekStartYmd);
  const weekStartDate = utcDateFromYmd(weekStartYmd);
  const weekEndDate = utcDateFromYmd(shiftYmd(weekStartYmd, 6));

  // Punch window: include any punch that lands on any of the 7 local calendar days. Use a
  // generous +/- 1 day UTC slice to keep the SQL simple — the in-memory bucketing below
  // restricts to the actual local days, so this just bounds the result set.
  const punchWindowStart = new Date(weekStartDate.getTime() - 24 * 60 * 60_000);
  const punchWindowEnd = new Date(weekEndDate.getTime() + 2 * 24 * 60 * 60_000);

  const [staffRows, rosterWeek, holidays, punches, overrides, graceMinutes] = await Promise.all([
    prisma.staff.findMany({
      where: { organizationId, locationId },
      orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        department: { select: { name: true } },
        punchExempt: true,
        archivedAt: true,
      },
    }),
    prisma.rosterWeek.findUnique({
      where: { locationId_weekStart: { locationId, weekStart: weekStartDate } },
      select: {
        id: true,
        entries: {
          select: {
            staffId: true,
            date: true,
            shiftTemplate: { select: { startTime: true, endTime: true } },
          },
        },
      },
    }),
    prisma.publicHoliday.findMany({
      where: {
        organizationId,
        locationId,
        date: { gte: weekStartDate, lte: weekEndDate },
      },
      select: { date: true, name: true, stationClosed: true },
    }),
    prisma.attendanceLog.findMany({
      where: {
        organizationId,
        locationId,
        punchAt: { gte: punchWindowStart, lte: punchWindowEnd },
      },
      orderBy: { punchAt: "asc" },
      select: {
        id: true,
        staffId: true,
        deviceUserId: true,
        punchAt: true,
        punchType: true,
        source: true,
        verifyMethod: true,
        note: true,
        originalPunchAt: true,
      },
    }),
    prisma.attendanceDayOverride.findMany({
      where: {
        staff: { organizationId, locationId },
        date: { gte: weekStartDate, lte: weekEndDate },
      },
      select: {
        id: true,
        staffId: true,
        date: true,
        status: true,
        lateReason: true,
        note: true,
      },
    }),
    getGraceMinutes(organizationId),
  ]);

  const visibleStaffRows = staffRows.filter((s) =>
    includeStaffOnAttendanceWeek(s, weekStartYmd, timeZone),
  );
  const staffById = new Map(visibleStaffRows.map((s) => [s.id, s] as const));

  const blockMap = await getApprovedBlockMap({
    staffIds: visibleStaffRows.map((s) => s.id),
    rangeStartDate: weekStartDate,
    rangeEndDate: weekEndDate,
  });

  const holidayMap: Record<string, { name: string; stationClosed: boolean }> = {};
  for (const h of holidays) {
    holidayMap[ymdForDbDate(h.date)] = { name: h.name, stationClosed: h.stationClosed };
  }

  const expectedByCell: Record<string, { startHHmm: string; endHHmm: string }> = {};
  for (const e of rosterWeek?.entries ?? []) {
    if (!e.shiftTemplate) continue;
    const key = `${e.staffId}__${ymdForDbDate(e.date)}`;
    expectedByCell[key] = {
      startHHmm: e.shiftTemplate.startTime,
      endHHmm: e.shiftTemplate.endTime,
    };
  }

  // Bucket punches by (staffId, ymd-in-zone). Punches with a null staffId can't appear in
  // any cell — they're surfaced in the log drawer's "unmatched" section only.
  const punchesByCell = new Map<string, Punch[]>();
  const punchIdsByCell = new Map<string, string[]>();
  const serializedPunches: SerializedPunch[] = [];
  for (const p of punches) {
    const staff = p.staffId ? staffById.get(p.staffId) : undefined;
    if (staff && !isStaffEventVisible(staff, p.punchAt)) continue;

    serializedPunches.push({
      id: p.id,
      staffId: p.staffId,
      deviceUserId: p.deviceUserId,
      punchAt: p.punchAt.toISOString(),
      punchType: p.punchType,
      source: p.source,
      verifyMethod: p.verifyMethod,
      note: p.note,
      corrected: p.originalPunchAt !== null,
      originalPunchAt: p.originalPunchAt ? p.originalPunchAt.toISOString() : null,
    });
    if (!p.staffId || !staff) continue;
    const ymd = formatYmdInZone(p.punchAt, timeZone);
    if (!days.includes(ymd)) continue;
    const key = `${p.staffId}__${ymd}`;
    let arr = punchesByCell.get(key);
    if (!arr) {
      arr = [];
      punchesByCell.set(key, arr);
    }
    arr.push({ punchAt: p.punchAt, punchType: p.punchType });
    let ids = punchIdsByCell.get(key);
    if (!ids) {
      ids = [];
      punchIdsByCell.set(key, ids);
    }
    ids.push(p.id);
  }

  const overrideByCell = new Map<string, "present" | "absent">();
  const serializedOverrides: SerializedOverride[] = [];
  for (const o of overrides) {
    const staff = staffById.get(o.staffId);
    if (!staff) continue;
    const ymd = ymdForDbDate(o.date);
    if (
      staff.archivedAt &&
      isYmdAfterArchiveDay(ymd, staff.archivedAt, timeZone)
    ) {
      continue;
    }
    overrideByCell.set(`${o.staffId}__${ymd}`, o.status);
    serializedOverrides.push({
      id: o.id,
      staffId: o.staffId,
      date: ymd,
      status: o.status,
      lateReason: o.lateReason,
      note: o.note,
    });
  }

  const cells: Record<string, AttendanceCell> = {};
  const irregularByStaff: Record<string, number> = {};
  let irregularCount = 0;

  const staffForClient: AttendanceStaff[] = visibleStaffRows.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    role: s.role,
    departmentName: s.department?.name ?? null,
    punchExempt: s.punchExempt,
    archivedAt: s.archivedAt ? s.archivedAt.toISOString() : null,
  }));

  for (const s of visibleStaffRows) {
    for (const d of days) {
      if (
        s.archivedAt &&
        isYmdAfterArchiveDay(d, s.archivedAt, timeZone)
      ) {
        continue;
      }

      const key = `${s.id}__${d}`;
      const expected = expectedByCell[key] ?? null;
      const result = computePresence({
        dateYmd: d,
        timeZone,
        expected,
        vacation: blockMap[key] === "vacation",
        dayOff: blockMap[key] === "dayOff",
        stationClosed: !!holidayMap[d]?.stationClosed,
        punchExempt: s.punchExempt,
        override: overrideByCell.get(key) ?? null,
        punches: punchesByCell.get(key) ?? [],
        graceMinutes,
      });
      cells[key] = {
        status: result.status,
        minutesLate: result.minutesLate,
        staffId: s.id,
        ymd: d,
        punchIds: punchIdsByCell.get(key) ?? [],
      };
      if (isIrregular(result.status)) {
        irregularCount += 1;
        irregularByStaff[s.id] = (irregularByStaff[s.id] ?? 0) + 1;
      }
    }
  }

  return {
    graceMinutes,
    staff: staffForClient,
    days,
    holidays: holidayMap,
    blockMap,
    punches: serializedPunches,
    overrides: serializedOverrides,
    expectedByCell,
    cells,
    irregularCount,
    irregularByStaff,
  };
}
