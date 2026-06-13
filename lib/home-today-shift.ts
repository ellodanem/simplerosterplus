/**
 * Derives the Home sidebar "Today on shift" card from the week attendance bootstrap.
 * No extra DB queries — caller passes `getAttendanceWeekData` output plus roster templates.
 */

import type { PresenceStatus } from "./attendance-policy";
import type { AttendanceWeekData } from "./attendance-week";
import { formatYmdInZone } from "./datetime-policy";
import { dayHeaderLabel } from "./roster-week";
import { formatRosterStaffName, formatStaffFullName } from "./staff-display-name";

export const HOME_TODAY_SCHEDULED_LIMIT = 4;
export const HOME_RECENT_PUNCHES_LIMIT = 5;

export type HomeTodayKpis = {
  present: number;
  late: number;
  absent: number;
  awaiting: number;
  scheduledTotal: number;
};

export type HomeTodayScheduledRow = {
  staffId: string;
  displayName: string;
  shiftName: string | null;
  firstInLabel: string | null;
  lastOutLabel: string | null;
  status: "present" | "late" | "awaiting" | "absent";
  statusLabel: string;
};

export type HomeRecentPunch = {
  id: string;
  timeLabel: string;
  punchType: "in" | "out";
  staffName: string;
  fromDevice: boolean;
};

export type HomeTodayShift = {
  todayLabel: string;
  stationClosed: boolean;
  closedHolidayName: string | null;
  kpis: HomeTodayKpis | null;
  scheduled: HomeTodayScheduledRow[];
  hiddenScheduledCount: number;
  recentPunches: HomeRecentPunch[];
};

const STATUS_ORDER: Record<HomeTodayScheduledRow["status"], number> = {
  late: 0,
  absent: 1,
  awaiting: 2,
  present: 3,
};

function formatTimeInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function statusBucket(
  status: PresenceStatus,
): HomeTodayScheduledRow["status"] | null {
  switch (status) {
    case "present":
    case "manual_present":
      return "present";
    case "late":
      return "late";
    case "scheduled":
      return "awaiting";
    case "absent":
    case "manual_absent":
      return "absent";
    default:
      return null;
  }
}

function rowStatusLabel(status: HomeTodayScheduledRow["status"]): string {
  switch (status) {
    case "present":
      return "Present";
    case "late":
      return "Late";
    case "awaiting":
      return "Awaiting";
    case "absent":
      return "Absent";
  }
}

function buildRecentPunches(
  attendance: AttendanceWeekData,
  todayYmd: string,
  timeZone: string,
  staffById: Map<string, AttendanceWeekData["staff"][number]>,
): HomeRecentPunch[] {
  const rows: Array<{
    id: string;
    punchAt: string;
    punchType: "in" | "out";
    staffName: string;
    fromDevice: boolean;
  }> = [];

  for (const punch of attendance.punches) {
    if (!punch.staffId) continue;
    const ymd = formatYmdInZone(new Date(punch.punchAt), timeZone);
    if (ymd !== todayYmd) continue;
    const staff = staffById.get(punch.staffId);
    if (!staff) continue;
    rows.push({
      id: punch.id,
      punchAt: punch.punchAt,
      punchType: punch.punchType,
      staffName: formatStaffFullName(staff.firstName, staff.lastName),
      fromDevice: punch.source === "device_adms" || punch.source === "device_pull",
    });
  }

  rows.sort((a, b) => b.punchAt.localeCompare(a.punchAt));

  return rows.slice(0, HOME_RECENT_PUNCHES_LIMIT).map((row) => ({
    id: row.id,
    timeLabel: formatTimeInZone(row.punchAt, timeZone),
    punchType: row.punchType,
    staffName: row.staffName,
    fromDevice: row.fromDevice,
  }));
}

export function buildHomeTodayShift(args: {
  attendance: AttendanceWeekData;
  todayYmd: string;
  timeZone: string;
  entries: Record<string, string>;
  templates: Array<{ id: string; name: string }>;
}): HomeTodayShift {
  const { attendance, todayYmd, timeZone, entries, templates } = args;
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const staffById = new Map(attendance.staff.map((s) => [s.id, s] as const));

  const holiday = attendance.holidays[todayYmd];
  const stationClosed = holiday?.stationClosed ?? false;
  const todayHeader = dayHeaderLabel(todayYmd, timeZone);
  const todayLabel = `${todayHeader.weekday} ${todayHeader.date}`;

  if (stationClosed) {
    return {
      todayLabel,
      stationClosed: true,
      closedHolidayName: holiday?.name ?? null,
      kpis: null,
      scheduled: [],
      hiddenScheduledCount: 0,
      recentPunches: [],
    };
  }

  const punchesTodayByStaff = new Map<
    string,
    { firstIn: string | null; lastOut: string | null }
  >();

  for (const punch of attendance.punches) {
    if (!punch.staffId) continue;
    const ymd = formatYmdInZone(new Date(punch.punchAt), timeZone);
    if (ymd !== todayYmd) continue;
    const current = punchesTodayByStaff.get(punch.staffId) ?? {
      firstIn: null,
      lastOut: null,
    };
    if (punch.punchType === "in") {
      if (!current.firstIn || punch.punchAt < current.firstIn) {
        current.firstIn = punch.punchAt;
      }
    } else if (!current.lastOut || punch.punchAt > current.lastOut) {
      current.lastOut = punch.punchAt;
    }
    punchesTodayByStaff.set(punch.staffId, current);
  }

  const kpis: HomeTodayKpis = {
    present: 0,
    late: 0,
    absent: 0,
    awaiting: 0,
    scheduledTotal: 0,
  };
  const scheduledRows: HomeTodayScheduledRow[] = [];

  for (const staff of attendance.staff) {
    const key = `${staff.id}__${todayYmd}`;
    const cell = attendance.cells[key];
    if (!cell) continue;
    const bucket = statusBucket(cell.status);
    if (!bucket) continue;

    kpis.scheduledTotal += 1;
    kpis[bucket] += 1;

    const tplId = entries[key];
    const shiftName = tplId ? (templateById.get(tplId)?.name ?? null) : null;
    const punchTimes = punchesTodayByStaff.get(staff.id);

    scheduledRows.push({
      staffId: staff.id,
      displayName: formatRosterStaffName(staff.firstName, staff.lastName),
      shiftName,
      firstInLabel: punchTimes?.firstIn
        ? formatTimeInZone(punchTimes.firstIn, timeZone)
        : null,
      lastOutLabel: punchTimes?.lastOut
        ? formatTimeInZone(punchTimes.lastOut, timeZone)
        : null,
      status: bucket,
      statusLabel: rowStatusLabel(bucket),
    });
  }

  scheduledRows.sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return a.displayName.localeCompare(b.displayName);
  });

  const visible = scheduledRows.slice(0, HOME_TODAY_SCHEDULED_LIMIT);
  const hiddenScheduledCount = Math.max(0, scheduledRows.length - HOME_TODAY_SCHEDULED_LIMIT);

  return {
    todayLabel,
    stationClosed: false,
    closedHolidayName: null,
    kpis,
    scheduled: visible,
    hiddenScheduledCount,
    recentPunches: buildRecentPunches(attendance, todayYmd, timeZone, staffById),
  };
}
