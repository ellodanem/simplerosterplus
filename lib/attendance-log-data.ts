/**
 * Assembler for the Log tab on /attendance.
 *
 * Differs from `attendance-week.ts` (the Week-tab assembler) in two important ways:
 *   1. Window is a rolling `[sinceDate, now]` instead of a calendar Mon–Sun week.
 *   2. Output is row-shaped (one row per punch) rather than cell-shaped, because the
 *      log view scrolls a flat list grouped by day.
 *
 * Each row carries its day's computed presence status (via `lib/attendance-policy.ts`)
 * so a supervisor can scan "08:02 IN · On time" / "09:24 IN · Late 14m" without
 * cross-referencing the schedule mentally.
 */

import { prisma } from "./prisma";
import { formatYmdInZone, utcDateFromYmd } from "./datetime-policy";
import { isStaffEventVisible } from "@/lib/staff-archive";
import { ymdForDbDate } from "./roster-week";
import {
  computePresence,
  isIrregular,
  type PresenceStatus,
  type Punch,
} from "./attendance-policy";
import { getGraceMinutes, type AttendanceStaff, type SerializedPunch } from "./attendance-week";

export const MAX_ATTENDANCE_LOG_ROWS = 1500;

export type LogRow = {
  punch: SerializedPunch;
  /** YYYY-MM-DD the punch falls on, evaluated in `timeZone`. */
  dayYmd: string;
  /** Computed presence status for the staff member on `dayYmd`. */
  dayStatus: PresenceStatus;
  /** Whole minutes late on the day's first in-punch, when applicable. */
  minutesLate: number | null;
};

export type LogKpis = {
  total: number;
  late: number;
  corrected: number;
  manual: number;
  device: number;
};

export type AttendanceLogData = {
  graceMinutes: number;
  staff: AttendanceStaff[];
  /** Most recent first. */
  rows: LogRow[];
  /** Quick metrics across the returned rows. */
  kpis: LogKpis;
  /** Earliest punchAt actually returned (or null when no rows). Used to render "Showing punches since …". */
  oldestPunchAt: string | null;
  /** When false, the response includes every active (non-extracted) punch. */
  windowed: boolean;
  /** Lower bound used to filter, ISO string. Null when `windowed` is false. */
  sinceIso: string | null;
  /** True when more rows matched than we returned. */
  hasMoreRows: boolean;
  /** Hard cap applied to the query result set. */
  rowLimit: number;
};

export async function getAttendanceLogData(args: {
  organizationId: string;
  locationId: string;
  timeZone: string;
  /** When set, the SQL filter is `punchAt >= sinceDate`. When null, no lower bound — every active punch. */
  sinceDate: Date | null;
  rowLimit?: number;
}): Promise<AttendanceLogData> {
  const {
    organizationId,
    locationId,
    timeZone,
    sinceDate,
    rowLimit = MAX_ATTENDANCE_LOG_ROWS,
  } = args;

  const [staffRows, graceMinutes, punchRows] = await Promise.all([
    prisma.staff.findMany({
      where: { organizationId, locationId },
      orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        punchExempt: true,
        archivedAt: true,
      },
    }),
    getGraceMinutes(organizationId),
    prisma.attendanceLog.findMany({
      where: {
        organizationId,
        locationId,
        // When the pay-period workflow lands, swap this for `extractedAt: null` so the
        // "active" feed automatically hides filed rows.
        ...(sinceDate ? { punchAt: { gte: sinceDate } } : {}),
      },
      orderBy: { punchAt: "desc" },
      take: rowLimit + 1,
      select: {
        id: true,
        staffId: true,
        punchAt: true,
        punchType: true,
        source: true,
        verifyMethod: true,
        note: true,
        originalPunchAt: true,
      },
    }),
  ]);
  const hasMoreRows = punchRows.length > rowLimit;
  const punches = hasMoreRows ? punchRows.slice(0, rowLimit) : punchRows;

  // Determine the set of (staffId, dayYmd) tuples we need presence for. Only days that
  // contain at least one punch — we don't synthesize "no punch" rows here (per product
  // decision to ignore non-punchers for v1).
  const staffById = new Map(staffRows.map((s) => [s.id, s] as const));

  const dayKeys = new Set<string>();
  const punchDayByPunchId = new Map<string, string>();
  for (const p of punches) {
    if (!p.staffId) continue;
    const staff = staffById.get(p.staffId);
    if (staff && !isStaffEventVisible(staff, p.punchAt)) continue;
    const ymd = formatYmdInZone(p.punchAt, timeZone);
    dayKeys.add(`${p.staffId}__${ymd}`);
    punchDayByPunchId.set(p.id, ymd);
  }

  // Bulk-fetch every input the presence helper needs for the touched days. Each query is
  // bounded by the YMD range (min..max across all dayKeys) so we don't pull the whole DB.
  let minYmd: string | null = null;
  let maxYmd: string | null = null;
  for (const k of dayKeys) {
    const ymd = k.split("__")[1];
    if (!minYmd || ymd < minYmd) minYmd = ymd;
    if (!maxYmd || ymd > maxYmd) maxYmd = ymd;
  }

  const staffByDayKey = new Map<string, PresenceStatus>();
  const minutesLateByDayKey = new Map<string, number | null>();

  if (dayKeys.size > 0 && minYmd && maxYmd) {
    const rangeStartDate = utcDateFromYmd(minYmd);
    const rangeEndDate = utcDateFromYmd(maxYmd);
    const touchedStaffIds = Array.from(new Set([...dayKeys].map((k) => k.split("__")[0])));

    const [rosterEntries, vacations, daysOff, holidays, overrides, allDayPunches] = await Promise.all([
      prisma.rosterEntry.findMany({
        where: {
          staffId: { in: touchedStaffIds },
          date: { gte: rangeStartDate, lte: rangeEndDate },
          shiftTemplateId: { not: null },
          rosterWeek: { locationId },
        },
        select: {
          staffId: true,
          date: true,
          shiftTemplate: { select: { startTime: true, endTime: true } },
        },
      }),
      prisma.staffVacation.findMany({
        where: {
          staffId: { in: touchedStaffIds },
          status: "approved",
          startDate: { lte: rangeEndDate },
          endDate: { gte: rangeStartDate },
        },
        select: { staffId: true, startDate: true, endDate: true },
      }),
      prisma.staffDayOff.findMany({
        where: {
          staffId: { in: touchedStaffIds },
          status: "approved",
          date: { gte: rangeStartDate, lte: rangeEndDate },
        },
        select: { staffId: true, date: true },
      }),
      prisma.publicHoliday.findMany({
        where: { organizationId, date: { gte: rangeStartDate, lte: rangeEndDate } },
        select: { date: true, stationClosed: true },
      }),
      prisma.attendanceDayOverride.findMany({
        where: {
          staffId: { in: touchedStaffIds },
          date: { gte: rangeStartDate, lte: rangeEndDate },
        },
        select: { staffId: true, date: true, status: true },
      }),
      // We need *all* punches on the touched days (not just the windowed ones) so the
      // presence helper sees the day's full picture — a punch from 6am still counts as
      // "first in" even if our window only includes punches from 8am onwards.
      prisma.attendanceLog.findMany({
        where: {
          organizationId,
          locationId,
          staffId: { in: touchedStaffIds },
          punchAt: {
            gte: new Date(rangeStartDate.getTime() - 24 * 60 * 60_000),
            lte: new Date(rangeEndDate.getTime() + 2 * 24 * 60 * 60_000),
          },
        },
        select: { staffId: true, punchAt: true, punchType: true },
      }),
    ]);

    const expectedByDayKey = new Map<string, { startHHmm: string; endHHmm: string }>();
    for (const e of rosterEntries) {
      if (!e.shiftTemplate) continue;
      expectedByDayKey.set(`${e.staffId}__${ymdForDbDate(e.date)}`, {
        startHHmm: e.shiftTemplate.startTime,
        endHHmm: e.shiftTemplate.endTime,
      });
    }

    const vacationDayKeys = new Set<string>();
    for (const v of vacations) {
      for (let t = v.startDate.getTime(); t <= v.endDate.getTime(); t += 24 * 60 * 60_000) {
        const ymd = ymdForDbDate(new Date(t));
        vacationDayKeys.add(`${v.staffId}__${ymd}`);
      }
    }
    const dayOffDayKeys = new Set<string>();
    for (const d of daysOff) {
      dayOffDayKeys.add(`${d.staffId}__${ymdForDbDate(d.date)}`);
    }

    const stationClosedYmds = new Set<string>();
    for (const h of holidays) {
      if (h.stationClosed) stationClosedYmds.add(ymdForDbDate(h.date));
    }

    const overrideByDayKey = new Map<string, "present" | "absent">();
    for (const o of overrides) {
      overrideByDayKey.set(`${o.staffId}__${ymdForDbDate(o.date)}`, o.status);
    }

    const punchesByDayKey = new Map<string, Punch[]>();
    for (const dp of allDayPunches) {
      if (!dp.staffId) continue;
      const staff = staffById.get(dp.staffId);
      if (staff && !isStaffEventVisible(staff, dp.punchAt)) continue;
      const ymd = formatYmdInZone(dp.punchAt, timeZone);
      const k = `${dp.staffId}__${ymd}`;
      let arr = punchesByDayKey.get(k);
      if (!arr) {
        arr = [];
        punchesByDayKey.set(k, arr);
      }
      arr.push({ punchAt: dp.punchAt, punchType: dp.punchType });
    }

    for (const key of dayKeys) {
      const [staffId, ymd] = key.split("__");
      const staff = staffById.get(staffId);
      if (!staff) continue;
      const result = computePresence({
        dateYmd: ymd,
        timeZone,
        expected: expectedByDayKey.get(key) ?? null,
        vacation: vacationDayKeys.has(key),
        dayOff: dayOffDayKeys.has(key),
        stationClosed: stationClosedYmds.has(ymd),
        punchExempt: staff.punchExempt,
        override: overrideByDayKey.get(key) ?? null,
        punches: punchesByDayKey.get(key) ?? [],
        graceMinutes,
      });
      staffByDayKey.set(key, result.status);
      minutesLateByDayKey.set(key, result.minutesLate);
    }
  }

  const rows: LogRow[] = [];
  let lateCount = 0;
  let correctedCount = 0;
  let manualCount = 0;
  let deviceCount = 0;
  for (const p of punches) {
    if (p.staffId) {
      const staff = staffById.get(p.staffId);
      if (staff && !isStaffEventVisible(staff, p.punchAt)) continue;
    }
    const dayYmd = p.staffId ? (punchDayByPunchId.get(p.id) ?? formatYmdInZone(p.punchAt, timeZone)) : formatYmdInZone(p.punchAt, timeZone);
    const dayKey = p.staffId ? `${p.staffId}__${dayYmd}` : null;
    const dayStatus: PresenceStatus = dayKey ? (staffByDayKey.get(dayKey) ?? "no_shift") : "no_shift";
    const minutesLate = dayKey ? (minutesLateByDayKey.get(dayKey) ?? null) : null;

    const serialized: SerializedPunch = {
      id: p.id,
      staffId: p.staffId,
      punchAt: p.punchAt.toISOString(),
      punchType: p.punchType,
      source: p.source,
      verifyMethod: p.verifyMethod,
      note: p.note,
      corrected: p.originalPunchAt !== null,
      originalPunchAt: p.originalPunchAt ? p.originalPunchAt.toISOString() : null,
    };
    rows.push({ punch: serialized, dayYmd, dayStatus, minutesLate });

    if (p.punchType === "in" && isIrregular(dayStatus)) lateCount += 1;
    if (p.originalPunchAt !== null) correctedCount += 1;
    if (p.source === "manual") manualCount += 1;
    else deviceCount += 1;
  }

  const staffForClient: AttendanceStaff[] = staffRows.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    role: s.role,
    punchExempt: s.punchExempt,
    archivedAt: s.archivedAt ? s.archivedAt.toISOString() : null,
  }));

  return {
    graceMinutes,
    staff: staffForClient,
    rows,
    kpis: {
      total: rows.length,
      late: lateCount,
      corrected: correctedCount,
      manual: manualCount,
      device: deviceCount,
    },
    oldestPunchAt: rows.length > 0 ? rows[rows.length - 1].punch.punchAt : null,
    windowed: sinceDate !== null,
    sinceIso: sinceDate ? sinceDate.toISOString() : null,
    hasMoreRows,
    rowLimit,
  };
}
