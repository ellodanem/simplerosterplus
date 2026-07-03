import { calendarWeekdayIndex } from "@/lib/datetime-policy";

export const SCHEDULING_RULES_ENABLED_KEY = "roster_scheduling_rules_enabled";
export const SCHEDULING_RULES_SUPERVISOR_ENABLED_KEY =
  "roster_scheduling_rules_supervisor_enabled";
export const SCHEDULING_RULES_SUPERVISOR_ROLES_KEY =
  "roster_scheduling_rules_supervisor_roles";
export const SCHEDULING_RULES_SUPERVISOR_WEEKDAYS_KEY =
  "roster_scheduling_rules_supervisor_weekdays";
export const SCHEDULING_RULES_SUNDAY_PATTERN_ENABLED_KEY =
  "roster_scheduling_rules_sunday_pattern_enabled";
export const SCHEDULING_RULES_SUNDAY_ANCHOR_WEEKDAY_KEY =
  "roster_scheduling_rules_sunday_anchor_weekday";
export const SCHEDULING_RULES_SUNDAY_ROTATION_ENABLED_KEY =
  "roster_scheduling_rules_sunday_rotation_enabled";

export const DEFAULT_SUPERVISOR_ROLE_NAMES = ["Supervisor"];
export const DEFAULT_SUPERVISOR_WEEKDAYS = [5, 6];
export const DEFAULT_SUNDAY_ANCHOR_WEEKDAY = 0;

export type SchedulingRulesSettings = {
  enabled: boolean;
  supervisorNoWeekendOff: {
    enabled: boolean;
    roleNames: string[];
    weekdays: number[];
  };
  sundayOrWeekdayOff: {
    enabled: boolean;
    anchorWeekday: number;
    /** When true, staff who worked the anchor day last week should be off that day this week. */
    rotateAnchorWeek: boolean;
  };
};

export const SCHEDULING_RULES_DEFAULTS: SchedulingRulesSettings = {
  enabled: false,
  supervisorNoWeekendOff: {
    enabled: false,
    roleNames: [...DEFAULT_SUPERVISOR_ROLE_NAMES],
    weekdays: [...DEFAULT_SUPERVISOR_WEEKDAYS],
  },
  sundayOrWeekdayOff: {
    enabled: false,
    anchorWeekday: DEFAULT_SUNDAY_ANCHOR_WEEKDAY,
    rotateAnchorWeek: false,
  },
};

export type SchedulingRuleViolation = {
  staffId: string;
  code: "supervisor_weekend_off" | "sunday_weekday_off_pattern" | "sunday_rotation";
  message: string;
  dates: string[];
};

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function normalizeRoleName(role: string): string {
  return role.trim().toLowerCase();
}

export function staffMatchesRoleNames(
  staffRole: string | null | undefined,
  roleNames: string[],
): boolean {
  const normalized = normalizeRoleName(staffRole ?? "");
  if (!normalized) return false;
  const allowed = new Set(roleNames.map(normalizeRoleName).filter(Boolean));
  return allowed.has(normalized);
}

export function parseRoleNamesCsv(value: string | null | undefined): string[] {
  if (!value?.trim()) return [...DEFAULT_SUPERVISOR_ROLE_NAMES];
  const names = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return names.length > 0 ? names : [...DEFAULT_SUPERVISOR_ROLE_NAMES];
}

export function formatRoleNamesCsv(roleNames: string[]): string {
  return roleNames.join(", ");
}

export function parseWeekdayList(value: string | null | undefined): number[] {
  if (!value?.trim()) return [...DEFAULT_SUPERVISOR_WEEKDAYS];
  const parsed = value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return parsed.length > 0 ? parsed : [...DEFAULT_SUPERVISOR_WEEKDAYS];
}

export function formatWeekdayList(weekdays: number[]): string {
  return weekdays.join(",");
}

export function parseSundayAnchorWeekday(value: string | null | undefined): number {
  if (value == null || value === "") return DEFAULT_SUNDAY_ANCHOR_WEEKDAY;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 6) return DEFAULT_SUNDAY_ANCHOR_WEEKDAY;
  return n;
}

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? "Day";
}

function cellKey(staffId: string, ymd: string): string {
  return `${staffId}__${ymd}`;
}

function hasShift(
  entries: Record<string, string>,
  staffId: string,
  ymd: string,
): boolean {
  return Boolean(entries[cellKey(staffId, ymd)]);
}

function isStationClosed(
  holidays: Record<string, { stationClosed: boolean }>,
  ymd: string,
): boolean {
  return holidays[ymd]?.stationClosed === true;
}

function isApprovedDayOff(
  blockMap: Record<string, "vacation" | "dayOff">,
  staffId: string,
  ymd: string,
): boolean {
  return blockMap[cellKey(staffId, ymd)] === "dayOff";
}

export function findCalendarDayInWeek(
  days: string[],
  weekday: number,
  timeZone: string,
): string | null {
  for (const ymd of days) {
    if (calendarWeekdayIndex(ymd, timeZone) === weekday) return ymd;
  }
  return null;
}

function supervisorWeekendViolations(args: {
  staffId: string;
  staffRole: string | null;
  days: string[];
  timeZone: string;
  entries: Record<string, string>;
  blockMap: Record<string, "vacation" | "dayOff">;
  holidays: Record<string, { stationClosed: boolean }>;
  settings: SchedulingRulesSettings;
}): SchedulingRuleViolation[] {
  const rule = args.settings.supervisorNoWeekendOff;
  if (!args.settings.enabled || !rule.enabled) return [];
  if (!staffMatchesRoleNames(args.staffRole, rule.roleNames)) return [];

  const dates: string[] = [];
  for (const ymd of args.days) {
    const weekday = calendarWeekdayIndex(ymd, args.timeZone);
    if (!rule.weekdays.includes(weekday)) continue;
    if (isStationClosed(args.holidays, ymd)) continue;
    if (isApprovedDayOff(args.blockMap, args.staffId, ymd)) continue;
    if (!hasShift(args.entries, args.staffId, ymd)) dates.push(ymd);
  }

  if (dates.length === 0) return [];
  const dayLabels = [...new Set(dates.map((ymd) => weekdayLabel(calendarWeekdayIndex(ymd, args.timeZone))))];
  return [
    {
      staffId: args.staffId,
      code: "supervisor_weekend_off",
      message: `${dayLabels.join(" and ")} off without approval`,
      dates,
    },
  ];
}

function sundayPatternViolations(args: {
  staffId: string;
  days: string[];
  timeZone: string;
  entries: Record<string, string>;
  blockMap: Record<string, "vacation" | "dayOff">;
  holidays: Record<string, { stationClosed: boolean }>;
  settings: SchedulingRulesSettings;
}): SchedulingRuleViolation[] {
  const rule = args.settings.sundayOrWeekdayOff;
  if (!args.settings.enabled || !rule.enabled) return [];

  const anchorYmd = findCalendarDayInWeek(args.days, rule.anchorWeekday, args.timeZone);
  if (!anchorYmd) return [];
  if (isStationClosed(args.holidays, anchorYmd)) return [];

  const anchorLabel = weekdayLabel(rule.anchorWeekday);
  const worksAnchor = hasShift(args.entries, args.staffId, anchorYmd);
  const weekdayOffDates: string[] = [];

  for (const ymd of args.days) {
    if (calendarWeekdayIndex(ymd, args.timeZone) === rule.anchorWeekday) continue;
    if (isStationClosed(args.holidays, ymd)) continue;
    if (args.blockMap[cellKey(args.staffId, ymd)]) continue;
    if (!hasShift(args.entries, args.staffId, ymd)) weekdayOffDates.push(ymd);
  }

  if (worksAnchor) {
    if (weekdayOffDates.length === 0) {
      return [
        {
          staffId: args.staffId,
          code: "sunday_weekday_off_pattern",
          message: `Works ${anchorLabel} but has no weekday off`,
          dates: [anchorYmd],
        },
      ];
    }
    return [];
  }

  if (!hasShift(args.entries, args.staffId, anchorYmd) && args.blockMap[cellKey(args.staffId, anchorYmd)]) {
    return [];
  }

  if (hasShift(args.entries, args.staffId, anchorYmd)) {
    return [];
  }

  if (weekdayOffDates.length > 0) {
    return [
      {
        staffId: args.staffId,
        code: "sunday_weekday_off_pattern",
        message: `${anchorLabel} is off but also has a weekday off`,
        dates: [anchorYmd, ...weekdayOffDates],
      },
    ];
  }

  return [];
}

function sundayRotationViolations(args: {
  staffId: string;
  days: string[];
  timeZone: string;
  entries: Record<string, string>;
  holidays: Record<string, { stationClosed: boolean }>;
  settings: SchedulingRulesSettings;
  workedAnchorLastWeek: Set<string>;
}): SchedulingRuleViolation[] {
  const rule = args.settings.sundayOrWeekdayOff;
  if (!args.settings.enabled || !rule.enabled || !rule.rotateAnchorWeek) return [];
  if (!args.workedAnchorLastWeek.has(args.staffId)) return [];

  const anchorYmd = findCalendarDayInWeek(args.days, rule.anchorWeekday, args.timeZone);
  if (!anchorYmd) return [];
  if (isStationClosed(args.holidays, anchorYmd)) return [];
  if (!hasShift(args.entries, args.staffId, anchorYmd)) return [];

  const anchorLabel = weekdayLabel(rule.anchorWeekday);
  return [
    {
      staffId: args.staffId,
      code: "sunday_rotation",
      message: `Worked ${anchorLabel} last week — should be off ${anchorLabel} this week`,
      dates: [anchorYmd],
    },
  ];
}

export function collectSchedulingRuleViolations(args: {
  staff: Array<{ id: string; role: string | null }>;
  days: string[];
  timeZone: string;
  entries: Record<string, string>;
  blockMap: Record<string, "vacation" | "dayOff">;
  holidays: Record<string, { stationClosed: boolean }>;
  settings: SchedulingRulesSettings;
  workedAnchorLastWeek?: Set<string>;
}): SchedulingRuleViolation[] {
  if (!args.settings.enabled) return [];

  const workedAnchorLastWeek = args.workedAnchorLastWeek ?? new Set<string>();
  const violations: SchedulingRuleViolation[] = [];
  for (const person of args.staff) {
    violations.push(
      ...supervisorWeekendViolations({
        staffId: person.id,
        staffRole: person.role,
        days: args.days,
        timeZone: args.timeZone,
        entries: args.entries,
        blockMap: args.blockMap,
        holidays: args.holidays,
        settings: args.settings,
      }),
    );
    violations.push(
      ...sundayPatternViolations({
        staffId: person.id,
        days: args.days,
        timeZone: args.timeZone,
        entries: args.entries,
        blockMap: args.blockMap,
        holidays: args.holidays,
        settings: args.settings,
      }),
    );
    violations.push(
      ...sundayRotationViolations({
        staffId: person.id,
        days: args.days,
        timeZone: args.timeZone,
        entries: args.entries,
        holidays: args.holidays,
        settings: args.settings,
        workedAnchorLastWeek,
      }),
    );
  }
  return violations;
}

export function violationsForStaff(
  violations: SchedulingRuleViolation[],
  staffId: string,
): SchedulingRuleViolation[] {
  return violations.filter((v) => v.staffId === staffId);
}

export function schedulingRuleViolationSummary(
  violations: SchedulingRuleViolation[],
  staffId: string,
): string | null {
  const rows = violationsForStaff(violations, staffId);
  if (rows.length === 0) return null;
  return rows.map((v) => v.message).join(" · ");
}

function entriesMapFromRecord(entries: Map<string, string> | Record<string, string>): Record<string, string> {
  if (entries instanceof Map) {
    return Object.fromEntries(entries.entries());
  }
  return entries;
}

export function filterProposalsBySchedulingRules<
  T extends { staffId: string; date: string; shiftTemplateId: string },
>(args: {
  proposals: T[];
  currentEntries: Map<string, string>;
  staff: Array<{ id: string; role: string | null }>;
  days: string[];
  timeZone: string;
  blockMap: Record<string, "vacation" | "dayOff">;
  holidays: Record<string, { stationClosed: boolean }>;
  settings: SchedulingRulesSettings;
  workedAnchorLastWeek?: Set<string>;
}): { proposals: T[]; skipped: Array<{ staffId: string; date: string; reason: string }> } {
  if (!args.settings.enabled) {
    return { proposals: args.proposals, skipped: [] };
  }

  const projected = new Map(args.currentEntries);
  const kept: T[] = [];
  const skipped: Array<{ staffId: string; date: string; reason: string }> = [];

  for (const proposal of args.proposals) {
    projected.set(cellKey(proposal.staffId, proposal.date), proposal.shiftTemplateId);
    const projectedRecord = entriesMapFromRecord(projected);
    const violations = collectSchedulingRuleViolations({
      staff: args.staff,
      days: args.days,
      timeZone: args.timeZone,
      entries: projectedRecord,
      blockMap: args.blockMap,
      holidays: args.holidays,
      settings: args.settings,
      workedAnchorLastWeek: args.workedAnchorLastWeek,
    });
    const staffViolations = violationsForStaff(violations, proposal.staffId);
    if (staffViolations.length > 0) {
      projected.delete(cellKey(proposal.staffId, proposal.date));
      skipped.push({
        staffId: proposal.staffId,
        date: proposal.date,
        reason: staffViolations[0]!.message,
      });
      continue;
    }
    kept.push(proposal);
  }

  return { proposals: kept, skipped };
}

export function countStaffWithSchedulingViolations(
  violations: SchedulingRuleViolation[],
): number {
  return new Set(violations.map((v) => v.staffId)).size;
}
