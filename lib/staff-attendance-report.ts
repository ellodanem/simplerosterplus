/**
 * Staff attendance report — roster-informed per-person day ledger for manager disputes.
 *
 * Differs from the live week grid (`computePresence` in attendance-policy.ts):
 *   - Report labels: Present / Absent / Excused / Off / Pending (no Late)
 *   - Punch cap applies to display + hours only, not presence
 *   - Includes all punches (filed/extracted when those fields exist)
 */

import { prisma } from "./prisma";
import {
  formatYmdInZone,
  utcDateFromYmd,
} from "./datetime-policy";
import { expandDeviceUserIdsForDbMatch, deviceUserIdsMatch } from "./device-user-id";
import { isStaffEventVisible, isYmdAfterArchiveDay } from "./staff-archive";
import { dayHeaderLabel, shiftYmd, ymdForDbDate } from "./roster-week";
import type { Punch } from "./attendance-policy";

export const EXPECTED_PUNCHES_KEY = "attendance_expected_punches_per_day";
export const EXPECTED_PUNCHES_DEFAULT = 4;
export const EXPECTED_PUNCHES_MAX = 20;
export const MAX_REPORT_RANGE_DAYS = 93;

export type ReportDayStatus = "present" | "absent" | "excused" | "off" | "pending";

export type PunchDayQuality = "full" | "possible_missed" | "irregular";

export type ReportPunchTime = {
  id: string;
  punchAt: string;
  punchType: "in" | "out";
  timeLabel: string;
  corrected: boolean;
};

export type StaffReportDay = {
  ymd: string;
  weekday: string;
  dateLabel: string;
  status: ReportDayStatus;
  statusLabel: string;
  shiftName: string | null;
  notes: string[];
  punches: ReportPunchTime[];
  excludedPunchCount: number;
  minutesWorked: number | null;
  hoursLabel: string | null;
  punchQuality: PunchDayQuality | null;
  punchQualityHint: string | null;
};

export type StaffAttendanceReport = {
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    punchExempt: boolean;
  };
  locationId: string;
  startYmd: string;
  endYmd: string;
  todayYmd: string;
  timeZone: string;
  expectedPunchesPerDay: number;
  totalMinutes: number;
  totalHoursLabel: string;
  days: StaffReportDay[];
};

type RosterCellKind = "scheduled" | "explicit_off" | "not_on_roster";

type ExcusedReason = "vacation" | "sick_leave" | "day_off" | "station_closed";

type RawPunchRow = {
  id: string;
  staffId: string | null;
  deviceUserId: string | null;
  punchAt: Date;
  punchType: "in" | "out";
  originalPunchAt: Date | null;
};

export async function getExpectedPunchesPerDay(organizationId: string): Promise<number> {
  const row = await prisma.appSetting.findUnique({
    where: { organizationId_key: { organizationId, key: EXPECTED_PUNCHES_KEY } },
    select: { value: true },
  });
  if (!row) return EXPECTED_PUNCHES_DEFAULT;
  const n = Number(row.value);
  if (!Number.isFinite(n) || n < 1) return EXPECTED_PUNCHES_DEFAULT;
  return Math.min(EXPECTED_PUNCHES_MAX, Math.round(n));
}

export function ymdRangeInclusive(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  let cur = startYmd;
  while (cur <= endYmd) {
    out.push(cur);
    cur = shiftYmd(cur, 1);
    if (out.length > MAX_REPORT_RANGE_DAYS + 1) break;
  }
  return out;
}

export function formatReportHours(totalMinutes: number): string {
  return `${(Math.max(0, totalMinutes) / 60).toFixed(2)}h`;
}

export function reportStatusLabel(status: ReportDayStatus): string {
  switch (status) {
    case "present":
      return "Present";
    case "absent":
      return "Absent";
    case "excused":
      return "Excused";
    case "off":
      return "Off";
    case "pending":
      return "Pending";
  }
}

function formatTimeInZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function excusedNote(reason: ExcusedReason, holidayName?: string | null): string {
  switch (reason) {
    case "vacation":
      return "Vacation";
    case "sick_leave":
      return "Sick leave";
    case "day_off":
      return "Day off";
    case "station_closed":
      return holidayName ? `Closed — ${holidayName}` : "Station closed";
  }
}

export function minutesFromInOutPairs(punches: Punch[]): number {
  const sorted = [...punches].sort((a, b) => a.punchAt.getTime() - b.punchAt.getTime());
  let openInAt: number | null = null;
  let totalMs = 0;
  for (const p of sorted) {
    if (p.punchType === "in") {
      openInAt = p.punchAt.getTime();
      continue;
    }
    if (openInAt === null || p.punchAt.getTime() <= openInAt) continue;
    totalMs += p.punchAt.getTime() - openInAt;
    openInAt = null;
  }
  return Math.round(totalMs / 60_000);
}

export function assessPunchDayQuality(
  punches: Punch[],
  expectedCount: number,
): { quality: PunchDayQuality | null; hint: string | null } {
  if (punches.length === 0) return { quality: null, hint: null };

  const sorted = [...punches].sort((a, b) => a.punchAt.getTime() - b.punchAt.getTime());
  let pairsCleanly = true;
  for (let i = 0; i < sorted.length; i++) {
    const want = i % 2 === 0 ? "in" : "out";
    if (sorted[i].punchType !== want) {
      pairsCleanly = false;
      break;
    }
  }

  if (sorted.length === expectedCount && pairsCleanly && sorted[0]?.punchType === "in") {
    return { quality: "full", hint: null };
  }
  if (sorted.length % 2 === 1 || sorted[0]?.punchType !== "in") {
    return {
      quality: "possible_missed",
      hint: "Punches may be incomplete — hours could be wrong.",
    };
  }
  return {
    quality: "irregular",
    hint: "Irregular punch sequence — hours could be wrong.",
  };
}

type ResolveReportDayInput = {
  ymd: string;
  todayYmd: string;
  excusedReason: ExcusedReason | null;
  holidayName: string | null;
  rosterCell: RosterCellKind;
  shiftName: string | null;
  punchExempt: boolean;
  override: "present" | "absent" | null;
  overrideLateReason: string | null;
  overrideNote: string | null;
  allPunches: Punch[];
};

export function resolveReportDay(input: ResolveReportDayInput): {
  status: ReportDayStatus;
  notes: string[];
} {
  const notes: string[] = [];
  if (input.shiftName && input.rosterCell === "scheduled") {
    notes.push(input.shiftName);
  }

  if (input.excusedReason) {
    return {
      status: "excused",
      notes: [excusedNote(input.excusedReason, input.holidayName), ...notes],
    };
  }

  if (input.override === "present") {
    const overrideNotes = ["Manual present"];
    if (input.overrideLateReason) overrideNotes.push(input.overrideLateReason);
    if (input.overrideNote) overrideNotes.push(input.overrideNote);
    return { status: "present", notes: [...overrideNotes, ...notes] };
  }

  if (input.punchExempt && input.rosterCell === "scheduled") {
    if (input.override === "absent") {
      const overrideNotes = ["Manual absent"];
      if (input.overrideNote) overrideNotes.push(input.overrideNote);
      return { status: "absent", notes: [...overrideNotes, ...notes] };
    }
    return { status: "present", notes: ["Exempt (no clock required)", ...notes] };
  }

  if (input.allPunches.length > 0) {
    if (input.rosterCell === "not_on_roster") {
      notes.unshift("Not on roster");
    }
    if (input.overrideLateReason) notes.push(input.overrideLateReason);
    return { status: "present", notes };
  }

  if (input.override === "absent") {
    const overrideNotes = ["Manual absent"];
    if (input.overrideNote) overrideNotes.push(input.overrideNote);
    return { status: "absent", notes: [...overrideNotes, ...notes] };
  }

  if (input.rosterCell === "scheduled") {
    if (input.ymd < input.todayYmd) {
      return { status: "absent", notes };
    }
    return { status: "pending", notes };
  }

  return { status: "off", notes };
}

function punchBelongsToStaff(row: RawPunchRow, staffId: string, staffDeviceUserId: string | null): boolean {
  if (row.staffId === staffId) return true;
  if (!staffDeviceUserId || !row.deviceUserId) return false;
  return deviceUserIdsMatch(row.deviceUserId, staffDeviceUserId);
}

export async function getStaffAttendanceReport(args: {
  organizationId: string;
  locationId: string;
  staffId: string;
  startYmd: string;
  endYmd: string;
  timeZone: string;
}): Promise<StaffAttendanceReport | null> {
  const { organizationId, locationId, staffId, startYmd, endYmd, timeZone } = args;

  const staff = await prisma.staff.findFirst({
    where: { id: staffId, organizationId, locationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      punchExempt: true,
      deviceUserId: true,
      archivedAt: true,
    },
  });
  if (!staff) return null;

  const rangeStartDate = utcDateFromYmd(startYmd);
  const rangeEndDate = utcDateFromYmd(endYmd);
  const punchWindowStart = new Date(rangeStartDate.getTime() - 24 * 60 * 60_000);
  const punchWindowEnd = new Date(rangeEndDate.getTime() + 2 * 24 * 60 * 60_000);

  const deviceLookupIds = staff.deviceUserId
    ? expandDeviceUserIdsForDbMatch([staff.deviceUserId])
    : [];

  const punchWhere =
    deviceLookupIds.length > 0
      ? {
          organizationId,
          locationId,
          OR: [{ staffId }, { deviceUserId: { in: deviceLookupIds } }],
          punchAt: { gte: punchWindowStart, lte: punchWindowEnd },
        }
      : {
          organizationId,
          locationId,
          staffId,
          punchAt: { gte: punchWindowStart, lte: punchWindowEnd },
        };

  const [expectedPunchesPerDay, rosterEntries, vacations, sickLeaves, daysOff, holidays, overrides, punchRows] =
    await Promise.all([
      getExpectedPunchesPerDay(organizationId),
      prisma.rosterEntry.findMany({
        where: {
          staffId,
          date: { gte: rangeStartDate, lte: rangeEndDate },
          rosterWeek: { locationId },
        },
        select: {
          date: true,
          shiftTemplateId: true,
          shiftTemplate: { select: { name: true } },
        },
      }),
      prisma.staffVacation.findMany({
        where: {
          staffId,
          status: "approved",
          startDate: { lte: rangeEndDate },
          endDate: { gte: rangeStartDate },
        },
        select: { startDate: true, endDate: true },
      }),
      prisma.staffSickLeave.findMany({
        where: {
          staffId,
          status: "approved",
          startDate: { lte: rangeEndDate },
          endDate: { gte: rangeStartDate },
        },
        select: { startDate: true, endDate: true },
      }),
      prisma.staffDayOff.findMany({
        where: {
          staffId,
          status: "approved",
          date: { gte: rangeStartDate, lte: rangeEndDate },
        },
        select: { date: true },
      }),
      prisma.publicHoliday.findMany({
        where: {
          organizationId,
          locationId,
          date: { gte: rangeStartDate, lte: rangeEndDate },
        },
        select: { date: true, name: true, stationClosed: true },
      }),
      prisma.attendanceDayOverride.findMany({
        where: {
          staffId,
          date: { gte: rangeStartDate, lte: rangeEndDate },
        },
        select: { date: true, status: true, lateReason: true, note: true },
      }),
      prisma.attendanceLog.findMany({
        where: punchWhere,
        orderBy: { punchAt: "asc" },
        select: {
          id: true,
          staffId: true,
          deviceUserId: true,
          punchAt: true,
          punchType: true,
          originalPunchAt: true,
        },
      }),
    ]);

  const rosterByYmd = new Map<
    string,
    { kind: RosterCellKind; shiftName: string | null }
  >();
  for (const e of rosterEntries) {
    const ymd = ymdForDbDate(e.date);
    if (e.shiftTemplateId && e.shiftTemplate) {
      rosterByYmd.set(ymd, { kind: "scheduled", shiftName: e.shiftTemplate.name });
    } else {
      rosterByYmd.set(ymd, { kind: "explicit_off", shiftName: null });
    }
  }

  const vacationYmds = new Set<string>();
  for (const v of vacations) {
    const start = v.startDate < rangeStartDate ? rangeStartDate : v.startDate;
    const end = v.endDate > rangeEndDate ? rangeEndDate : v.endDate;
    for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60_000) {
      vacationYmds.add(ymdForDbDate(new Date(t)));
    }
  }

  const sickLeaveYmds = new Set<string>();
  for (const s of sickLeaves) {
    const start = s.startDate < rangeStartDate ? rangeStartDate : s.startDate;
    const end = s.endDate > rangeEndDate ? rangeEndDate : s.endDate;
    for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60_000) {
      sickLeaveYmds.add(ymdForDbDate(new Date(t)));
    }
  }

  const dayOffYmds = new Set<string>();
  for (const d of daysOff) {
    dayOffYmds.add(ymdForDbDate(d.date));
  }

  const holidayByYmd = new Map<string, { name: string; stationClosed: boolean }>();
  for (const h of holidays) {
    holidayByYmd.set(ymdForDbDate(h.date), { name: h.name, stationClosed: h.stationClosed });
  }

  const overrideByYmd = new Map<
    string,
    { status: "present" | "absent"; lateReason: string | null; note: string | null }
  >();
  for (const o of overrides) {
    overrideByYmd.set(ymdForDbDate(o.date), {
      status: o.status,
      lateReason: o.lateReason,
      note: o.note,
    });
  }

  const punchesByYmd = new Map<string, RawPunchRow[]>();
  for (const p of punchRows) {
    if (!punchBelongsToStaff(p, staffId, staff.deviceUserId)) continue;
    if (!isStaffEventVisible(staff, p.punchAt)) continue;
    const ymd = formatYmdInZone(p.punchAt, timeZone);
    if (ymd < startYmd || ymd > endYmd) continue;
    let arr = punchesByYmd.get(ymd);
    if (!arr) {
      arr = [];
      punchesByYmd.set(ymd, arr);
    }
    arr.push(p);
  }

  const todayYmd = formatYmdInZone(new Date(), timeZone);
  const ymds = ymdRangeInclusive(startYmd, endYmd);
  let totalMinutes = 0;
  const days: StaffReportDay[] = [];

  for (const ymd of ymds) {
    if (staff.archivedAt && isYmdAfterArchiveDay(ymd, staff.archivedAt, timeZone)) {
      continue;
    }

    const roster = rosterByYmd.get(ymd) ?? { kind: "not_on_roster" as const, shiftName: null };
    const holiday = holidayByYmd.get(ymd);
    let excusedReason: ExcusedReason | null = null;
    if (holiday?.stationClosed) {
      excusedReason = "station_closed";
    } else if (vacationYmds.has(ymd)) {
      excusedReason = "vacation";
    } else if (sickLeaveYmds.has(ymd)) {
      excusedReason = "sick_leave";
    } else if (dayOffYmds.has(ymd)) {
      excusedReason = "day_off";
    }

    const override = overrideByYmd.get(ymd) ?? null;
    const dayPunches = punchesByYmd.get(ymd) ?? [];
    const allPunches: Punch[] = dayPunches.map((p) => ({
      punchAt: p.punchAt,
      punchType: p.punchType,
    }));

    const resolved = resolveReportDay({
      ymd,
      todayYmd,
      excusedReason,
      holidayName: holiday?.name ?? null,
      rosterCell: roster.kind,
      shiftName: roster.shiftName,
      punchExempt: staff.punchExempt,
      override: override?.status ?? null,
      overrideLateReason: override?.lateReason ?? null,
      overrideNote: override?.note ?? null,
      allPunches,
    });

    const sortedDayPunches = [...dayPunches].sort(
      (a, b) => a.punchAt.getTime() - b.punchAt.getTime(),
    );
    const cappedRaw = sortedDayPunches.slice(0, expectedPunchesPerDay);
    const excludedPunchCount = Math.max(0, sortedDayPunches.length - cappedRaw.length);

    const cappedPunches: Punch[] = cappedRaw.map((p) => ({
      punchAt: p.punchAt,
      punchType: p.punchType,
    }));

    const notes = [...resolved.notes];
    if (excludedPunchCount > 0) {
      notes.push(
        `${excludedPunchCount} later punch${excludedPunchCount === 1 ? "" : "es"} excluded from hours`,
      );
    }

    const skipHours =
      staff.punchExempt && roster.kind === "scheduled" && resolved.status === "present";

    let minutesWorked: number | null = null;
    let hoursLabel: string | null = null;
    if (!skipHours && resolved.status === "present" && cappedPunches.length > 0) {
      minutesWorked = minutesFromInOutPairs(cappedPunches);
      hoursLabel = formatReportHours(minutesWorked);
      totalMinutes += minutesWorked;
    }

    const { quality, hint } = assessPunchDayQuality(cappedPunches, expectedPunchesPerDay);

    const header = dayHeaderLabel(ymd, timeZone);
    days.push({
      ymd,
      weekday: header.weekday,
      dateLabel: header.date,
      status: resolved.status,
      statusLabel: reportStatusLabel(resolved.status),
      shiftName: roster.shiftName,
      notes,
      punches: cappedRaw.map((p) => ({
        id: p.id,
        punchAt: p.punchAt.toISOString(),
        punchType: p.punchType,
        timeLabel: formatTimeInZone(p.punchAt, timeZone),
        corrected: p.originalPunchAt !== null,
      })),
      excludedPunchCount,
      minutesWorked,
      hoursLabel,
      punchQuality: quality,
      punchQualityHint: hint,
    });
  }

  return {
    staff: {
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      punchExempt: staff.punchExempt,
    },
    locationId,
    startYmd,
    endYmd,
    todayYmd,
    timeZone,
    expectedPunchesPerDay,
    totalMinutes,
    totalHoursLabel: formatReportHours(totalMinutes),
    days,
  };
}
