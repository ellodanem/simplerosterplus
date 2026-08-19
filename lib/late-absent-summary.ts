/**
 * Period Late & Absent summary — rostered staff ranked by late/absent incident counts.
 * Uses the same `computePresence` rules as the live week board.
 */

import { prisma } from "./prisma";
import { formatYmdInZone, utcDateFromYmd } from "./datetime-policy";
import { getApprovedBlockMap } from "./leave-blocks";
import { dayHeaderLabel, shiftYmd, ymdForDbDate } from "./roster-week";
import { isStaffEventVisible, isYmdAfterArchiveDay } from "./staff-archive";
import {
  computePresence,
  localTimeToUtc,
  type PresenceStatus,
  type Punch,
} from "./attendance-policy";
import { getAttendanceThresholds } from "./attendance-week";
import { MAX_REPORT_RANGE_DAYS, ymdRangeInclusive } from "./staff-attendance-report";
import { payPeriodToYmd } from "./pay-period-db";

export { MAX_REPORT_RANGE_DAYS };

export type LateAbsentPreset = "this" | "last" | "custom";

export type LateAbsentDayStatus =
  | "late"
  | "absent"
  | "present"
  | "excused"
  | "pending"
  | "exempt"
  | "manual_present"
  | "manual_absent";

export type LateAbsentDayRow = {
  ymd: string;
  dateLabel: string;
  shiftName: string;
  shiftColor: string | null;
  status: LateAbsentDayStatus;
  statusLabel: string;
  punchLabel: string;
  afterStartLabel: string;
  minutesAfterStart: number | null;
};

export type LateAbsentStaffSummary = {
  staffId: string;
  firstName: string;
  lastName: string;
  lateCount: number;
  absentCount: number;
  total: number;
  lastIncidentYmd: string | null;
  lastIncidentStatus: "late" | "absent" | null;
  lastIncidentLabel: string | null;
};

export type LateAbsentSummary = {
  locationId: string;
  startYmd: string;
  endYmd: string;
  todayYmd: string;
  timeZone: string;
  periodLabel: string;
  lateAfterMinutes: number;
  absentAfterMinutes: number;
  legend: string;
  totalLate: number;
  totalAbsent: number;
  staffWithIncidents: number;
  staffRostered: number;
  staff: LateAbsentStaffSummary[];
};

export type LateAbsentDrillDown = {
  summary: LateAbsentSummary;
  staff: LateAbsentStaffSummary;
  days: LateAbsentDayRow[];
};

function formatTimeInZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function shortDateLabel(ymd: string, timeZone: string): string {
  const { weekday, date } = dayHeaderLabel(ymd, timeZone);
  return `${weekday} ${date}`;
}

function incidentLabel(ymd: string, status: "late" | "absent", timeZone: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
  return `${monthDay} ${status}`;
}

function mapReportStatus(status: PresenceStatus): LateAbsentDayStatus | null {
  switch (status) {
    case "late":
      return "late";
    case "absent":
    case "manual_absent":
      return status === "manual_absent" ? "manual_absent" : "absent";
    case "present":
      return "present";
    case "manual_present":
      return "manual_present";
    case "scheduled":
      return "pending";
    case "exempt":
      return "exempt";
    case "on_vacation":
    case "on_sick_leave":
    case "day_off":
    case "station_closed":
      return "excused";
    case "no_shift":
      return null;
  }
}

function statusLabel(status: LateAbsentDayStatus): string {
  switch (status) {
    case "late":
      return "Late";
    case "absent":
      return "Absent";
    case "present":
      return "On time";
    case "excused":
      return "Excused";
    case "pending":
      return "Pending";
    case "exempt":
      return "Exempt";
    case "manual_present":
      return "Present (manual)";
    case "manual_absent":
      return "Absent (manual)";
  }
}

function afterStartLabel(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes === 0) return "0m";
  return minutes > 0 ? `+${minutes}m` : `${minutes}m`;
}

export async function resolveLateAbsentRange(args: {
  locationId: string;
  timeZone: string;
  preset: LateAbsentPreset;
  startYmd?: string;
  endYmd?: string;
}): Promise<{ startYmd: string; endYmd: string; periodLabel: string } | { error: string }> {
  const todayYmd = formatYmdInZone(new Date(), args.timeZone);

  if (args.preset === "custom") {
    const start = args.startYmd;
    const end = args.endYmd;
    if (!start || !end) return { error: "Custom range requires start and end dates." };
    if (start > end) return { error: "Start date must be on or before end date." };
    const days = ymdRangeInclusive(start, end);
    if (days.length > MAX_REPORT_RANGE_DAYS) {
      return { error: `Range cannot exceed ${MAX_REPORT_RANGE_DAYS} days.` };
    }
    return {
      startYmd: start,
      endYmd: end,
      periodLabel: `${start} to ${end}`,
    };
  }

  const periods = await prisma.payPeriod.findMany({
    where: { locationId: args.locationId },
    orderBy: [{ endDate: "desc" }, { createdAt: "desc" }],
    take: 8,
    select: { startDate: true, endDate: true },
  });

  const mapped = periods.map((p) => ({
    startYmd: payPeriodToYmd(p.startDate),
    endYmd: payPeriodToYmd(p.endDate),
  }));

  if (args.preset === "this") {
    const containing = mapped.find((p) => p.startYmd <= todayYmd && todayYmd <= p.endYmd);
    if (containing) {
      return {
        startYmd: containing.startYmd,
        endYmd: containing.endYmd,
        periodLabel: `This pay period (${containing.startYmd} to ${containing.endYmd})`,
      };
    }
    const latest = mapped[0];
    if (latest && latest.endYmd < todayYmd) {
      const startYmd = shiftYmd(latest.endYmd, 1);
      return {
        startYmd,
        endYmd: todayYmd,
        periodLabel: `Current period (${startYmd} to ${todayYmd})`,
      };
    }
    const startYmd = shiftYmd(todayYmd, -13);
    return {
      startYmd,
      endYmd: todayYmd,
      periodLabel: `Last 14 days (${startYmd} to ${todayYmd})`,
    };
  }

  // last
  const ended = mapped.find((p) => p.endYmd < todayYmd);
  if (ended) {
    return {
      startYmd: ended.startYmd,
      endYmd: ended.endYmd,
      periodLabel: `Last pay period (${ended.startYmd} to ${ended.endYmd})`,
    };
  }
  if (mapped[0]) {
    return {
      startYmd: mapped[0].startYmd,
      endYmd: mapped[0].endYmd,
      periodLabel: `Latest filed period (${mapped[0].startYmd} to ${mapped[0].endYmd})`,
    };
  }
  const endYmd = shiftYmd(todayYmd, -14);
  const startYmd = shiftYmd(endYmd, -13);
  return {
    startYmd,
    endYmd,
    periodLabel: `Previous 14 days (${startYmd} to ${endYmd})`,
  };
}

type ExpectedCell = {
  startHHmm: string;
  endHHmm: string;
  shiftName: string;
  shiftColor: string | null;
};

async function loadPeriodInputs(args: {
  organizationId: string;
  locationId: string;
  startYmd: string;
  endYmd: string;
  timeZone: string;
}) {
  const { organizationId, locationId, startYmd, endYmd, timeZone } = args;
  const rangeStartDate = utcDateFromYmd(startYmd);
  const rangeEndDate = utcDateFromYmd(endYmd);
  const punchWindowStart = new Date(rangeStartDate.getTime() - 24 * 60 * 60_000);
  const punchWindowEnd = new Date(rangeEndDate.getTime() + 2 * 24 * 60 * 60_000);

  const [thresholds, staffRows, rosterEntries, holidays, overrides, punches] = await Promise.all([
    getAttendanceThresholds(organizationId),
    prisma.staff.findMany({
      where: { organizationId, locationId },
      orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        punchExempt: true,
        archivedAt: true,
      },
    }),
    prisma.rosterEntry.findMany({
      where: {
        date: { gte: rangeStartDate, lte: rangeEndDate },
        rosterWeek: { locationId },
        shiftTemplateId: { not: null },
      },
      select: {
        staffId: true,
        date: true,
        shiftTemplate: {
          select: { name: true, startTime: true, endTime: true, color: true },
        },
      },
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
        staff: { organizationId, locationId },
        date: { gte: rangeStartDate, lte: rangeEndDate },
      },
      select: { staffId: true, date: true, status: true },
    }),
    prisma.attendanceLog.findMany({
      where: {
        organizationId,
        locationId,
        staffId: { not: null },
        punchAt: { gte: punchWindowStart, lte: punchWindowEnd },
      },
      orderBy: { punchAt: "asc" },
      select: {
        staffId: true,
        punchAt: true,
        punchType: true,
      },
    }),
  ]);

  const rosteredStaffIds = new Set<string>();
  const expectedByCell = new Map<string, ExpectedCell>();
  for (const e of rosterEntries) {
    if (!e.shiftTemplate) continue;
    const ymd = ymdForDbDate(e.date);
    const key = `${e.staffId}__${ymd}`;
    const existing = expectedByCell.get(key);
    // Earliest start wins when multiple shifts exist on one day.
    if (
      !existing ||
      e.shiftTemplate.startTime < existing.startHHmm
    ) {
      expectedByCell.set(key, {
        startHHmm: e.shiftTemplate.startTime,
        endHHmm: e.shiftTemplate.endTime,
        shiftName: e.shiftTemplate.name,
        shiftColor: e.shiftTemplate.color,
      });
    }
    rosteredStaffIds.add(e.staffId);
  }

  const staff = staffRows.filter((s) => rosteredStaffIds.has(s.id));
  const staffIds = staff.map((s) => s.id);
  const blockMap = await getApprovedBlockMap({
    staffIds,
    rangeStartDate,
    rangeEndDate,
  });

  const holidayMap = new Map<string, { name: string; stationClosed: boolean }>();
  for (const h of holidays) {
    holidayMap.set(ymdForDbDate(h.date), {
      name: h.name,
      stationClosed: h.stationClosed,
    });
  }

  const overrideByCell = new Map<string, "present" | "absent">();
  for (const o of overrides) {
    overrideByCell.set(`${o.staffId}__${ymdForDbDate(o.date)}`, o.status);
  }

  const punchesByCell = new Map<string, Punch[]>();
  const staffById = new Map(staff.map((s) => [s.id, s] as const));
  for (const p of punches) {
    if (!p.staffId) continue;
    const s = staffById.get(p.staffId);
    if (!s || !isStaffEventVisible(s, p.punchAt)) continue;
    const ymd = formatYmdInZone(p.punchAt, timeZone);
    if (ymd < startYmd || ymd > endYmd) continue;
    const key = `${p.staffId}__${ymd}`;
    let arr = punchesByCell.get(key);
    if (!arr) {
      arr = [];
      punchesByCell.set(key, arr);
    }
    arr.push({ punchAt: p.punchAt, punchType: p.punchType });
  }

  return {
    thresholds,
    staff,
    expectedByCell,
    blockMap,
    holidayMap,
    overrideByCell,
    punchesByCell,
    todayYmd: formatYmdInZone(new Date(), timeZone),
  };
}

export async function getLateAbsentSummary(args: {
  organizationId: string;
  locationId: string;
  startYmd: string;
  endYmd: string;
  timeZone: string;
  periodLabel: string;
}): Promise<LateAbsentSummary> {
  const inputs = await loadPeriodInputs(args);
  const { lateAfterMinutes, absentAfterMinutes } = inputs.thresholds;
  const ymds = ymdRangeInclusive(args.startYmd, args.endYmd);
  const nowUtc = new Date();

  const staffSummaries: LateAbsentStaffSummary[] = [];
  let totalLate = 0;
  let totalAbsent = 0;

  for (const s of inputs.staff) {
    let lateCount = 0;
    let absentCount = 0;
    let lastIncidentYmd: string | null = null;
    let lastIncidentStatus: "late" | "absent" | null = null;

    for (const ymd of ymds) {
      if (s.archivedAt && isYmdAfterArchiveDay(ymd, s.archivedAt, args.timeZone)) {
        continue;
      }
      const key = `${s.id}__${ymd}`;
      const expected = inputs.expectedByCell.get(key);
      if (!expected) continue;

      const result = computePresence({
        dateYmd: ymd,
        timeZone: args.timeZone,
        expected: { startHHmm: expected.startHHmm, endHHmm: expected.endHHmm },
        vacation: inputs.blockMap[key] === "vacation",
        sickLeave: inputs.blockMap[key] === "sickLeave",
        dayOff: inputs.blockMap[key] === "dayOff",
        stationClosed: !!inputs.holidayMap.get(ymd)?.stationClosed,
        punchExempt: s.punchExempt,
        override: inputs.overrideByCell.get(key) ?? null,
        punches: inputs.punchesByCell.get(key) ?? [],
        lateAfterMinutes,
        absentAfterMinutes,
        nowUtc,
      });

      if (result.status === "late") {
        lateCount += 1;
        totalLate += 1;
        lastIncidentYmd = ymd;
        lastIncidentStatus = "late";
      } else if (result.status === "absent") {
        absentCount += 1;
        totalAbsent += 1;
        lastIncidentYmd = ymd;
        lastIncidentStatus = "absent";
      }
    }

    staffSummaries.push({
      staffId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      lateCount,
      absentCount,
      total: lateCount + absentCount,
      lastIncidentYmd,
      lastIncidentStatus,
      lastIncidentLabel:
        lastIncidentYmd && lastIncidentStatus
          ? incidentLabel(lastIncidentYmd, lastIncidentStatus, args.timeZone)
          : null,
    });
  }

  const withIncidents = staffSummaries
    .filter((s) => s.total > 0)
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      const an = `${a.lastName} ${a.firstName}`.toLowerCase();
      const bn = `${b.lastName} ${b.firstName}`.toLowerCase();
      return an.localeCompare(bn);
    });

  return {
    locationId: args.locationId,
    startYmd: args.startYmd,
    endYmd: args.endYmd,
    todayYmd: inputs.todayYmd,
    timeZone: args.timeZone,
    periodLabel: args.periodLabel,
    lateAfterMinutes,
    absentAfterMinutes,
    legend: `Late = first punch after ${lateAfterMinutes} min past shift start. Absent = scheduled day with no punch by ${absentAfterMinutes} min. Vacation, sick leave, approved day off, and station closed are excused.`,
    totalLate,
    totalAbsent,
    staffWithIncidents: withIncidents.length,
    staffRostered: staffSummaries.length,
    staff: withIncidents,
  };
}

export async function getLateAbsentDrillDown(args: {
  organizationId: string;
  locationId: string;
  staffId: string;
  startYmd: string;
  endYmd: string;
  timeZone: string;
  periodLabel: string;
}): Promise<LateAbsentDrillDown | null> {
  const inputs = await loadPeriodInputs(args);
  const s = inputs.staff.find((row) => row.id === args.staffId);
  if (!s) return null;

  const summary = await getLateAbsentSummary(args);
  const { lateAfterMinutes, absentAfterMinutes } = inputs.thresholds;
  const ymds = ymdRangeInclusive(args.startYmd, args.endYmd);
  const nowUtc = new Date();
  const days: LateAbsentDayRow[] = [];

  let lateCount = 0;
  let absentCount = 0;
  let lastIncidentYmd: string | null = null;
  let lastIncidentStatus: "late" | "absent" | null = null;

  for (const ymd of ymds) {
    if (s.archivedAt && isYmdAfterArchiveDay(ymd, s.archivedAt, args.timeZone)) {
      continue;
    }
    const key = `${s.id}__${ymd}`;
    const expected = inputs.expectedByCell.get(key);
    if (!expected) continue;

    const punches = inputs.punchesByCell.get(key) ?? [];
    const result = computePresence({
      dateYmd: ymd,
      timeZone: args.timeZone,
      expected: { startHHmm: expected.startHHmm, endHHmm: expected.endHHmm },
      vacation: inputs.blockMap[key] === "vacation",
      sickLeave: inputs.blockMap[key] === "sickLeave",
      dayOff: inputs.blockMap[key] === "dayOff",
      stationClosed: !!inputs.holidayMap.get(ymd)?.stationClosed,
      punchExempt: s.punchExempt,
      override: inputs.overrideByCell.get(key) ?? null,
      punches,
      lateAfterMinutes,
      absentAfterMinutes,
      nowUtc,
    });

    const mapped = mapReportStatus(result.status);
    if (!mapped) continue;

    if (result.status === "late") {
      lateCount += 1;
      lastIncidentYmd = ymd;
      lastIncidentStatus = "late";
    } else if (result.status === "absent") {
      absentCount += 1;
      lastIncidentYmd = ymd;
      lastIncidentStatus = "absent";
    }

    const startUtc = localTimeToUtc(ymd, expected.startHHmm, args.timeZone);
    let minutesAfterStart: number | null = null;
    let punchLabel = "No punch";
    if (result.firstInAt) {
      punchLabel = formatTimeInZone(result.firstInAt, args.timeZone);
      if (startUtc) {
        minutesAfterStart = Math.round(
          (result.firstInAt.getTime() - startUtc.getTime()) / 60_000,
        );
      }
    }

    days.push({
      ymd,
      dateLabel: shortDateLabel(ymd, args.timeZone),
      shiftName: expected.shiftName,
      shiftColor: expected.shiftColor,
      status: mapped,
      statusLabel: statusLabel(mapped),
      punchLabel,
      afterStartLabel: afterStartLabel(minutesAfterStart),
      minutesAfterStart,
    });
  }

  const staffSummary: LateAbsentStaffSummary =
    summary.staff.find((row) => row.staffId === s.id) ?? {
      staffId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      lateCount,
      absentCount,
      total: lateCount + absentCount,
      lastIncidentYmd,
      lastIncidentStatus,
      lastIncidentLabel:
        lastIncidentYmd && lastIncidentStatus
          ? incidentLabel(lastIncidentYmd, lastIncidentStatus, args.timeZone)
          : null,
    };

  return { summary, staff: staffSummary, days };
}

export async function getLateAbsentExportRows(args: {
  organizationId: string;
  locationId: string;
  startYmd: string;
  endYmd: string;
  timeZone: string;
  periodLabel: string;
}): Promise<{
  summary: LateAbsentSummary;
  incidentDays: Array<{
    staffName: string;
    ymd: string;
    shiftName: string;
    status: string;
    punchLabel: string;
    afterStartLabel: string;
  }>;
}> {
  const summary = await getLateAbsentSummary(args);
  const inputs = await loadPeriodInputs(args);
  const { lateAfterMinutes, absentAfterMinutes } = inputs.thresholds;
  const ymds = ymdRangeInclusive(args.startYmd, args.endYmd);
  const nowUtc = new Date();
  const incidentDays: Array<{
    staffName: string;
    ymd: string;
    shiftName: string;
    status: string;
    punchLabel: string;
    afterStartLabel: string;
  }> = [];

  for (const s of inputs.staff) {
    for (const ymd of ymds) {
      if (s.archivedAt && isYmdAfterArchiveDay(ymd, s.archivedAt, args.timeZone)) continue;
      const key = `${s.id}__${ymd}`;
      const expected = inputs.expectedByCell.get(key);
      if (!expected) continue;
      const result = computePresence({
        dateYmd: ymd,
        timeZone: args.timeZone,
        expected: { startHHmm: expected.startHHmm, endHHmm: expected.endHHmm },
        vacation: inputs.blockMap[key] === "vacation",
        sickLeave: inputs.blockMap[key] === "sickLeave",
        dayOff: inputs.blockMap[key] === "dayOff",
        stationClosed: !!inputs.holidayMap.get(ymd)?.stationClosed,
        punchExempt: s.punchExempt,
        override: inputs.overrideByCell.get(key) ?? null,
        punches: inputs.punchesByCell.get(key) ?? [],
        lateAfterMinutes,
        absentAfterMinutes,
        nowUtc,
      });
      if (result.status !== "late" && result.status !== "absent") continue;
      const startUtc = localTimeToUtc(ymd, expected.startHHmm, args.timeZone);
      let minutesAfterStart: number | null = null;
      let punchLabel = "No punch";
      if (result.firstInAt) {
        punchLabel = formatTimeInZone(result.firstInAt, args.timeZone);
        if (startUtc) {
          minutesAfterStart = Math.round(
            (result.firstInAt.getTime() - startUtc.getTime()) / 60_000,
          );
        }
      }
      incidentDays.push({
        staffName: `${s.firstName} ${s.lastName}`,
        ymd,
        shiftName: expected.shiftName,
        status: result.status,
        punchLabel,
        afterStartLabel: afterStartLabel(minutesAfterStart),
      });
    }
  }

  return { summary, incidentDays };
}

/** Relative luminance helper for shift badge text color. */
export function contrastTextForHex(color: string | null): "#111827" | "#ffffff" {
  if (!color) return "#111827";
  const hex = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "#111827";
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? "#111827" : "#ffffff";
}

export function buildLateAbsentCsv(
  summary: LateAbsentSummary,
  incidentDays: Array<{
    staffName: string;
    ymd: string;
    shiftName: string;
    status: string;
    punchLabel: string;
    afterStartLabel: string;
  }>,
): string {
  const lines: string[] = [];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

  lines.push("Late & Absent Summary");
  lines.push(esc(summary.periodLabel));
  lines.push("");
  lines.push("Staff,Late,Absent,Total,Last incident");
  for (const row of summary.staff) {
    lines.push(
      [
        esc(`${row.firstName} ${row.lastName}`),
        String(row.lateCount),
        String(row.absentCount),
        String(row.total),
        esc(row.lastIncidentLabel ?? ""),
      ].join(","),
    );
  }
  lines.push("");
  lines.push("Incident days");
  lines.push("Staff,Date,Shift,Status,Punch,After start");
  for (const d of incidentDays) {
    lines.push(
      [
        esc(d.staffName),
        d.ymd,
        esc(d.shiftName),
        esc(d.status),
        esc(d.punchLabel),
        esc(d.afterStartLabel),
      ].join(","),
    );
  }
  lines.push("");
  lines.push(esc(summary.legend));
  return lines.join("\n");
}
