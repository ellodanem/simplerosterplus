/**
 * Backward-compatible facade over the new rule-template registry.
 *
 * All callers that imported from `@/lib/roster-scheduling-rules` keep working.
 * Internally, the old hardcoded evaluators are replaced by the evaluator
 * registry in `@/lib/scheduling-rule-registry`.
 */

export {
  weekdayLabel,
  normalizeRoleName,
  staffMatchesRoleNames,
  WEEKDAY_NAMES,
  type SchedulingRuleViolation,
  type SchedulingRuleRecord,
  collectRuleViolations,
  violationsForStaff,
  schedulingRuleViolationSummary,
  countStaffWithSchedulingViolations,
  filterProposalsByRules,
  legacySettingsToRules,
  type LegacySchedulingRulesSettings,
  RULE_TEMPLATES,
} from "@/lib/scheduling-rule-registry";

import {
  collectRuleViolations,
  legacySettingsToRules,
  filterProposalsByRules,
  type SchedulingRuleRecord,
  type SchedulingRuleViolation,
  type LegacySchedulingRulesSettings,
  type RuleEvalContext,
} from "@/lib/scheduling-rule-registry";
import { calendarWeekdayIndex } from "@/lib/datetime-policy";

// ---------------------------------------------------------------------------
// Legacy type alias — consumers that import SchedulingRulesSettings keep compiling
// ---------------------------------------------------------------------------

export type SchedulingRulesSettings = LegacySchedulingRulesSettings;

export const DEFAULT_SUPERVISOR_ROLE_NAMES = ["Supervisor"];
export const DEFAULT_SUPERVISOR_WEEKDAYS = [5, 6];
export const DEFAULT_SUNDAY_ANCHOR_WEEKDAY = 0;

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

// AppSetting keys — kept for the migration seeder and old settings reader
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

// ---------------------------------------------------------------------------
// Parse helpers still used by the settings API route
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// findCalendarDayInWeek — still used by auto-scheduler.ts
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Legacy facade: collectSchedulingRuleViolations
// Converts old SchedulingRulesSettings → rule records → evaluator registry
// ---------------------------------------------------------------------------

export function collectSchedulingRuleViolations(args: {
  staff: Array<{ id: string; role: string | null }>;
  days: string[];
  timeZone: string;
  entries: Record<string, string>;
  blockMap: Record<string, "vacation" | "sickLeave" | "dayOff">;
  holidays: Record<string, { stationClosed: boolean }>;
  settings: SchedulingRulesSettings;
  rules?: SchedulingRuleRecord[];
  workedAnchorLastWeek?: Set<string>;
}): SchedulingRuleViolation[] {
  const rules = args.rules ?? legacySettingsToRules(args.settings);
  if (rules.length === 0) return [];

  const ctx: RuleEvalContext = {
    staff: args.staff,
    days: args.days,
    timeZone: args.timeZone,
    entries: args.entries,
    blockMap: args.blockMap,
    holidays: args.holidays,
    workedAnchorLastWeek: args.workedAnchorLastWeek ?? new Set(),
  };

  return collectRuleViolations(rules, ctx);
}

// ---------------------------------------------------------------------------
// Legacy facade: filterProposalsBySchedulingRules
// ---------------------------------------------------------------------------

export function filterProposalsBySchedulingRules<
  T extends { staffId: string; date: string; shiftTemplateId: string },
>(args: {
  proposals: T[];
  currentEntries: Map<string, string>;
  staff: Array<{ id: string; role: string | null }>;
  days: string[];
  timeZone: string;
  blockMap: Record<string, "vacation" | "sickLeave" | "dayOff">;
  holidays: Record<string, { stationClosed: boolean }>;
  settings: SchedulingRulesSettings;
  rules?: SchedulingRuleRecord[];
  workedAnchorLastWeek?: Set<string>;
}): { proposals: T[]; skipped: Array<{ staffId: string; date: string; reason: string }> } {
  const rules = args.rules ?? legacySettingsToRules(args.settings);
  if (rules.length === 0) {
    return { proposals: args.proposals, skipped: [] };
  }

  const ctx: RuleEvalContext = {
    staff: args.staff,
    days: args.days,
    timeZone: args.timeZone,
    entries: Object.fromEntries(args.currentEntries),
    blockMap: args.blockMap,
    holidays: args.holidays,
    workedAnchorLastWeek: args.workedAnchorLastWeek ?? new Set(),
  };

  return filterProposalsByRules({
    proposals: args.proposals,
    currentEntries: args.currentEntries,
    rules,
    ctx,
  });
}
