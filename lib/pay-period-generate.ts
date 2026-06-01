import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  endOfLocalDayUtc,
  formatYmdInZone,
  shiftYmdLocal,
  startOfLocalDayUtc,
  utcDateFromYmd,
} from "./datetime-policy";
import { deviceUserIdsMatch } from "./device-user-id";
import { minutesFromInOutPairs } from "./staff-attendance-report";
import type { Punch } from "./attendance-policy";
import {
  isPayPeriodBaselineStaff,
  isPayPeriodManager,
  payPeriodStaffName,
} from "./pay-period-roster";
import type { PayPeriodDraft, PayPeriodRow } from "./pay-period-types";
import { VACATION_MARKER } from "./pay-period-types";
import { roundTransTtl } from "./pay-period-rows";
import { ymdForDbDate } from "./roster-week";

const SICK_RANGE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatSickRangeLabel(startYmd: string, endYmd: string): string {
  const start = utcDateFromYmd(startYmd);
  const end = utcDateFromYmd(endYmd);
  if (startYmd === endYmd) return SICK_RANGE_FORMATTER.format(start);
  return `${SICK_RANGE_FORMATTER.format(start)} – ${SICK_RANGE_FORMATTER.format(end)}`;
}

function ymdOverlapDays(
  periodStart: string,
  periodEnd: string,
  rangeStart: string,
  rangeEnd: string,
): { count: number; overlapStart: string; overlapEnd: string } | null {
  const start = periodStart > rangeStart ? periodStart : rangeStart;
  const end = periodEnd < rangeEnd ? periodEnd : rangeEnd;
  if (start > end) return null;
  let count = 0;
  let cur = start;
  while (cur <= end) {
    count += 1;
    cur = shiftYmdLocal(cur, 1);
  }
  return { count, overlapStart: start, overlapEnd: end };
}

function enumerateYmds(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = shiftYmdLocal(cur, 1);
  }
  return out;
}

export async function generatePayPeriodReport(args: {
  organizationId: string;
  locationId: string;
  timeZone: string;
  startDate: string;
  endDate: string;
  entityName: string;
}): Promise<PayPeriodDraft> {
  const { organizationId, locationId, timeZone, startDate, endDate, entityName } = args;
  const periodStartUtc = startOfLocalDayUtc(startDate, timeZone);
  const periodEndUtc = endOfLocalDayUtc(endDate, timeZone);
  const rangeStartDate = utcDateFromYmd(startDate);
  const rangeEndDate = utcDateFromYmd(endDate);
  const reportDate = formatYmdInZone(new Date(), timeZone);

  const staffRows = await prisma.staff.findMany({
    where: { organizationId, locationId },
    orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      punchExempt: true,
      archivedAt: true,
      deviceUserId: true,
      staffRole: { select: { name: true } },
    },
  });

  const staffById = new Map(
    staffRows.map((s) => [
      s.id,
      {
        ...s,
        staffRoleName: s.staffRole?.name ?? null,
      },
    ]),
  );

  const deviceToStaffId = new Map<string, string>();
  for (const s of staffRows) {
    if (!s.deviceUserId) continue;
    for (const key of [s.deviceUserId.trim(), s.deviceUserId]) {
      if (key) deviceToStaffId.set(key, s.id);
    }
  }

  function resolveStaffId(staffId: string | null, deviceUserId: string | null): string | null {
    if (staffId && staffById.has(staffId)) return staffId;
    if (!deviceUserId) return null;
    const direct = deviceToStaffId.get(deviceUserId.trim());
    if (direct) return direct;
    for (const s of staffRows) {
      if (s.deviceUserId && deviceUserIdsMatch(deviceUserId, s.deviceUserId)) return s.id;
    }
    return null;
  }

  const punchRows = await prisma.attendanceLog.findMany({
    where: {
      organizationId,
      locationId,
      punchAt: { gte: periodStartUtc, lte: periodEndUtc },
    },
    orderBy: { punchAt: "asc" },
    select: {
      staffId: true,
      deviceUserId: true,
      punchAt: true,
      punchType: true,
    },
  });

  const punchesByStaff = new Map<string, Punch[]>();
  const staffWithPunches = new Set<string>();
  for (const p of punchRows) {
    const sid = resolveStaffId(p.staffId, p.deviceUserId);
    if (!sid) continue;
    staffWithPunches.add(sid);
    let arr = punchesByStaff.get(sid);
    if (!arr) {
      arr = [];
      punchesByStaff.set(sid, arr);
    }
    arr.push({ punchAt: p.punchAt, punchType: p.punchType });
  }

  const transTtlByStaff = new Map<string, number>();
  for (const [sid, punches] of punchesByStaff) {
    const minutes = minutesFromInOutPairs(punches);
    transTtlByStaff.set(sid, roundTransTtl(minutes / 60));
  }

  const [vacations, sickLeaves] = await Promise.all([
    prisma.staffVacation.findMany({
      where: {
        staff: { organizationId, locationId },
        status: "approved",
        startDate: { lte: rangeEndDate },
        endDate: { gte: rangeStartDate },
      },
      select: { staffId: true, startDate: true, endDate: true },
    }),
    prisma.staffSickLeave.findMany({
      where: {
        staff: { organizationId, locationId },
        status: "approved",
        startDate: { lte: rangeEndDate },
        endDate: { gte: rangeStartDate },
      },
      select: { staffId: true, startDate: true, endDate: true },
    }),
  ]);

  const vacationStaff = new Set<string>();
  for (const v of vacations) {
    const vStart = ymdForDbDate(v.startDate);
    const vEnd = ymdForDbDate(v.endDate);
    if (vStart <= endDate && vEnd >= startDate) vacationStaff.add(v.staffId);
  }

  const sickByStaff = new Map<string, { days: number; ranges: string[] }>();
  for (const s of sickLeaves) {
    const sStart = ymdForDbDate(s.startDate);
    const sEnd = ymdForDbDate(s.endDate);
    const overlap = ymdOverlapDays(startDate, endDate, sStart, sEnd);
    if (!overlap) continue;
    const label = formatSickRangeLabel(overlap.overlapStart, overlap.overlapEnd);
    const cur = sickByStaff.get(s.staffId) ?? { days: 0, ranges: [] };
    cur.days += overlap.count;
    cur.ranges.push(label);
    sickByStaff.set(s.staffId, cur);
  }

  const baselineIds = new Set<string>();
  for (const s of staffRows) {
    if (
      isPayPeriodBaselineStaff({
        punchExempt: s.punchExempt,
        archivedAt: s.archivedAt,
        role: s.role,
        staffRoleName: s.staffRole?.name ?? null,
      })
    ) {
      baselineIds.add(s.id);
    }
  }

  const supplementalIds = new Set<string>();
  for (const s of staffRows) {
    if (!s.archivedAt) continue;
    const staffRoleName = s.staffRole?.name ?? null;
    if (isPayPeriodManager(s.role, staffRoleName)) continue;
    if (staffWithPunches.has(s.id)) supplementalIds.add(s.id);
    if (sickByStaff.has(s.id)) supplementalIds.add(s.id);
    if (vacationStaff.has(s.id)) supplementalIds.add(s.id);
  }

  const includedIds = new Set([...baselineIds, ...supplementalIds]);

  const rows: PayPeriodRow[] = [];
  for (const id of includedIds) {
    const s = staffById.get(id);
    if (!s) continue;
    const sick = sickByStaff.get(id);
    rows.push({
      staffId: id,
      staffName: payPeriodStaffName(s.firstName, s.lastName),
      transTtl: transTtlByStaff.get(id) ?? 0,
      vacation: vacationStaff.has(id) ? VACATION_MARKER : "",
      shortage: 0,
      sickLeaveDays: sick?.days ?? 0,
      sickLeaveRanges: sick?.ranges.join("; ") ?? "",
    });
  }

  rows.sort((a, b) => {
    const sa = staffById.get(a.staffId);
    const sb = staffById.get(b.staffId);
    const orderA = sa ? staffRows.findIndex((x) => x.id === sa.id) : 9999;
    const orderB = sb ? staffRows.findIndex((x) => x.id === sb.id) : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return a.staffName.localeCompare(b.staffName);
  });

  return {
    startDate,
    endDate,
    reportDate,
    entityName,
    rows,
  };
}

/** Mark non-extracted punches in the period window (idempotent). */
export async function filePunchesForPayPeriod(
  args: {
    organizationId: string;
    locationId: string;
    timeZone: string;
    startDate: string;
    endDate: string;
    payPeriodId: string;
    filedAt: Date;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const periodStartUtc = startOfLocalDayUtc(args.startDate, args.timeZone);
  const periodEndUtc = endOfLocalDayUtc(args.endDate, args.timeZone);
  await db.attendanceLog.updateMany({
    where: {
      organizationId: args.organizationId,
      locationId: args.locationId,
      punchAt: { gte: periodStartUtc, lte: periodEndUtc },
      extractedAt: null,
    },
    data: {
      extractedAt: args.filedAt,
      extractedPayPeriodId: args.payPeriodId,
    },
  });
}
