/**
 * Derives the Home sidebar "Today on shift" card from the week attendance bootstrap.
 * No extra DB queries — caller passes `getAttendanceWeekData` output.
 */

import type { PresenceStatus } from "./attendance-policy";
import type { AttendanceWeekData } from "./attendance-week";
import { formatYmdInZone } from "./datetime-policy";
import { dayHeaderLabel } from "./roster-week";
import { formatStaffFullName } from "./staff-display-name";

export const HOME_RECENT_PUNCHES_LIMIT = 5;

export type HomeTodayKpis = {
  present: number;
  late: number;
  absent: number;
  scheduledTotal: number;
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
  recentPunches: HomeRecentPunch[];
};

function formatTimeInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function statusBucket(status: PresenceStatus): "present" | "late" | "absent" | null {
  switch (status) {
    case "present":
    case "manual_present":
      return "present";
    case "late":
      return "late";
    case "absent":
    case "manual_absent":
      return "absent";
    default:
      return null;
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
}): HomeTodayShift {
  const { attendance, todayYmd, timeZone } = args;
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
      recentPunches: [],
    };
  }

  const kpis: HomeTodayKpis = {
    present: 0,
    late: 0,
    absent: 0,
    scheduledTotal: 0,
  };

  for (const staff of attendance.staff) {
    const key = `${staff.id}__${todayYmd}`;
    const cell = attendance.cells[key];
    if (!cell) continue;
    if (cell.status === "scheduled") {
      kpis.scheduledTotal += 1;
      continue;
    }

    const bucket = statusBucket(cell.status);
    if (!bucket) continue;

    kpis.scheduledTotal += 1;
    kpis[bucket] += 1;
  }

  return {
    todayLabel,
    stationClosed: false,
    closedHolidayName: null,
    kpis,
    recentPunches: buildRecentPunches(attendance, todayYmd, timeZone, staffById),
  };
}
