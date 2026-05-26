import { startOfLocalDayUtc } from "@/lib/datetime-policy";
import { shiftYmd } from "@/lib/roster-week";

export const OVERTIME_ENABLED_DEFAULT = true;
export const OVERTIME_WEEKLY_THRESHOLD_DEFAULT = 40;
export const OVERTIME_WEEKLY_THRESHOLD_MIN = 1;
export const OVERTIME_WEEKLY_THRESHOLD_MAX = 168;
export const OVERTIME_WEEKLY_THRESHOLD_STEP = 0.25;
export const OVERTIME_APPROACHING_BUFFER_HOURS = 4;

export type OvertimeStatus = "normal" | "approaching" | "over";

export type OvertimeSettings = {
  enabled: boolean;
  weeklyThresholdHours: number;
};

export type OvertimeSummary = {
  totalMinutes: number;
  status: OvertimeStatus;
};

export type OvertimePunchLike = {
  staffId: string | null;
  punchAt: string;
  punchType: "in" | "out";
};

export function parseOvertimeEnabled(value: string | null | undefined): boolean {
  if (value == null || value === "") return OVERTIME_ENABLED_DEFAULT;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return OVERTIME_ENABLED_DEFAULT;
}

export function clampOvertimeThresholdHours(hours: number): number {
  if (!Number.isFinite(hours)) return OVERTIME_WEEKLY_THRESHOLD_DEFAULT;
  const rounded =
    Math.round(hours / OVERTIME_WEEKLY_THRESHOLD_STEP) * OVERTIME_WEEKLY_THRESHOLD_STEP;
  return Math.min(
    OVERTIME_WEEKLY_THRESHOLD_MAX,
    Math.max(OVERTIME_WEEKLY_THRESHOLD_MIN, rounded),
  );
}

export function isValidOvertimeThresholdHours(hours: number): boolean {
  if (!Number.isFinite(hours)) return false;
  if (hours < OVERTIME_WEEKLY_THRESHOLD_MIN || hours > OVERTIME_WEEKLY_THRESHOLD_MAX) {
    return false;
  }
  const steps = hours / OVERTIME_WEEKLY_THRESHOLD_STEP;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

export function parseOvertimeThresholdHours(value: string | null | undefined): number {
  if (value == null || value === "") return OVERTIME_WEEKLY_THRESHOLD_DEFAULT;
  return clampOvertimeThresholdHours(Number(value));
}

export function classifyOvertime(
  totalMinutes: number,
  settings: OvertimeSettings,
): OvertimeStatus {
  const minutes = Math.max(0, totalMinutes);
  const thresholdMinutes = settings.weeklyThresholdHours * 60;
  const approachingMinutes = Math.max(
    0,
    thresholdMinutes - OVERTIME_APPROACHING_BUFFER_HOURS * 60,
  );
  if (minutes >= thresholdMinutes) return "over";
  if (minutes >= approachingMinutes) return "approaching";
  return "normal";
}

export function summarizeOvertimeByStaff(
  totalsByStaff: Record<string, number>,
  settings: OvertimeSettings,
): Record<string, OvertimeSummary> {
  const summaries: Record<string, OvertimeSummary> = {};
  for (const [staffId, totalMinutes] of Object.entries(totalsByStaff)) {
    summaries[staffId] = {
      totalMinutes,
      status: settings.enabled ? classifyOvertime(totalMinutes, settings) : "normal",
    };
  }
  return summaries;
}

export function countOvertimeAlerts(
  summaries: Iterable<Pick<OvertimeSummary, "status">>,
): { approaching: number; over: number } {
  let approaching = 0;
  let over = 0;
  for (const summary of summaries) {
    if (summary.status === "approaching") approaching += 1;
    if (summary.status === "over") over += 1;
  }
  return { approaching, over };
}

export function formatOvertimeHours(totalMinutes: number): string {
  const hours = Math.max(0, totalMinutes) / 60;
  const rounded = Number(hours.toFixed(2)).toString();
  return `${rounded}h`;
}

export function getScheduledMinutesByStaff(
  shifts: Array<{ staffId: string; minutes: number }>,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const shift of shifts) {
    totals[shift.staffId] = (totals[shift.staffId] ?? 0) + Math.max(0, shift.minutes);
  }
  return totals;
}

export function getWorkedMinutesByStaff(args: {
  punches: OvertimePunchLike[];
  weekStartYmd: string;
  timeZone: string;
}): Record<string, number> {
  const { punches, weekStartYmd, timeZone } = args;
  const weekStartMs = startOfLocalDayUtc(weekStartYmd, timeZone).getTime();
  const weekEndMs = startOfLocalDayUtc(shiftYmd(weekStartYmd, 7), timeZone).getTime();

  const punchesByStaff = new Map<
    string,
    Array<{ punchAtMs: number; punchType: "in" | "out" }>
  >();

  for (const punch of punches) {
    if (!punch.staffId) continue;
    const at = new Date(punch.punchAt).getTime();
    const staffPunches = punchesByStaff.get(punch.staffId);
    if (staffPunches) {
      staffPunches.push({ punchAtMs: at, punchType: punch.punchType });
    } else {
      punchesByStaff.set(punch.staffId, [{ punchAtMs: at, punchType: punch.punchType }]);
    }
  }

  const totals: Record<string, number> = {};

  for (const [staffId, staffPunches] of punchesByStaff) {
    staffPunches.sort((a, b) => a.punchAtMs - b.punchAtMs);
    let openInAt: number | null = null;
    let totalMs = 0;

    for (const punch of staffPunches) {
      if (punch.punchType === "in") {
        openInAt = punch.punchAtMs;
        continue;
      }
      if (openInAt === null || punch.punchAtMs <= openInAt) continue;

      const overlapStart = Math.max(openInAt, weekStartMs);
      const overlapEnd = Math.min(punch.punchAtMs, weekEndMs);
      if (overlapEnd > overlapStart) {
        totalMs += overlapEnd - overlapStart;
      }
      openInAt = null;
    }

    totals[staffId] = Math.round(totalMs / 60_000);
  }

  return totals;
}
