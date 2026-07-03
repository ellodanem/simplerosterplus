import { calendarWeekdayIndex } from "@/lib/datetime-policy";

// ---------------------------------------------------------------------------
// Rule type catalog — each type has a params shape, an evaluator, and metadata
// ---------------------------------------------------------------------------

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? "Day";
}

export type SchedulingRuleRecord = {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  sortOrder: number;
  params: Record<string, unknown>;
};

export type SchedulingRuleViolation = {
  ruleId: string;
  ruleType: string;
  staffId: string;
  message: string;
  dates: string[];
};

export type RuleEvalContext = {
  staff: Array<{ id: string; role: string | null }>;
  days: string[];
  timeZone: string;
  entries: Record<string, string>;
  blockMap: Record<string, "vacation" | "dayOff">;
  holidays: Record<string, { stationClosed: boolean }>;
  workedAnchorLastWeek: Set<string>;
};

export type RuleEvaluator = (
  rule: SchedulingRuleRecord,
  person: { id: string; role: string | null },
  ctx: RuleEvalContext,
) => SchedulingRuleViolation[];

export type RuleTemplateMeta = {
  type: string;
  label: string;
  description: string;
  category: "coverage" | "limits" | "rotation";
  defaultParams: Record<string, unknown>;
  evaluate: RuleEvaluator;
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function cellKey(staffId: string, ymd: string): string {
  return `${staffId}__${ymd}`;
}

function hasShift(entries: Record<string, string>, staffId: string, ymd: string): boolean {
  return Boolean(entries[cellKey(staffId, ymd)]);
}

function isStationClosed(holidays: Record<string, { stationClosed: boolean }>, ymd: string): boolean {
  return holidays[ymd]?.stationClosed === true;
}

function isApprovedDayOff(blockMap: Record<string, "vacation" | "dayOff">, staffId: string, ymd: string): boolean {
  return blockMap[cellKey(staffId, ymd)] === "dayOff";
}

function findCalendarDayInWeekLocal(days: string[], weekday: number, timeZone: string): string | null {
  for (const ymd of days) {
    if (calendarWeekdayIndex(ymd, timeZone) === weekday) return ymd;
  }
  return null;
}

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

// ---------------------------------------------------------------------------
// Rule type: role_must_work_on_weekdays
// Params: { roleNames: string[], weekdays: number[], exceptApprovedDayOff: boolean }
// ---------------------------------------------------------------------------

export type RoleMustWorkParams = {
  roleNames: string[];
  weekdays: number[];
  exceptApprovedDayOff: boolean;
};

function parseRoleMustWorkParams(raw: Record<string, unknown>): RoleMustWorkParams {
  const roleNames = Array.isArray(raw.roleNames)
    ? (raw.roleNames as string[]).filter((s) => typeof s === "string" && s.trim())
    : ["Supervisor"];
  const weekdays = Array.isArray(raw.weekdays)
    ? (raw.weekdays as number[]).filter((n) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 6)
    : [5, 6];
  const exceptApprovedDayOff = raw.exceptApprovedDayOff !== false;
  return { roleNames, weekdays, exceptApprovedDayOff };
}

const evaluateRoleMustWork: RuleEvaluator = (rule, person, ctx) => {
  const params = parseRoleMustWorkParams(rule.params);
  if (!staffMatchesRoleNames(person.role, params.roleNames)) return [];

  const dates: string[] = [];
  for (const ymd of ctx.days) {
    const weekday = calendarWeekdayIndex(ymd, ctx.timeZone);
    if (!params.weekdays.includes(weekday)) continue;
    if (isStationClosed(ctx.holidays, ymd)) continue;
    if (params.exceptApprovedDayOff && isApprovedDayOff(ctx.blockMap, person.id, ymd)) continue;
    if (!hasShift(ctx.entries, person.id, ymd)) dates.push(ymd);
  }

  if (dates.length === 0) return [];
  const dayLabels = [...new Set(dates.map((ymd) => weekdayLabel(calendarWeekdayIndex(ymd, ctx.timeZone))))];
  return [
    {
      ruleId: rule.id,
      ruleType: rule.type,
      staffId: person.id,
      message: `${dayLabels.join(" and ")} off without approval`,
      dates,
    },
  ];
};

// ---------------------------------------------------------------------------
// Rule type: anchor_xor_weekday_off
// Params: { anchorWeekday: number, weekdayOffCount: number }
// ---------------------------------------------------------------------------

export type AnchorXorParams = {
  anchorWeekday: number;
  weekdayOffCount: number;
};

function parseAnchorXorParams(raw: Record<string, unknown>): AnchorXorParams {
  const anchorWeekday = typeof raw.anchorWeekday === "number" && Number.isInteger(raw.anchorWeekday) && raw.anchorWeekday >= 0 && raw.anchorWeekday <= 6
    ? raw.anchorWeekday
    : 0;
  const weekdayOffCount = typeof raw.weekdayOffCount === "number" && Number.isInteger(raw.weekdayOffCount) && raw.weekdayOffCount >= 1
    ? raw.weekdayOffCount
    : 1;
  return { anchorWeekday, weekdayOffCount };
}

const evaluateAnchorXor: RuleEvaluator = (rule, person, ctx) => {
  const params = parseAnchorXorParams(rule.params);

  const anchorYmd = findCalendarDayInWeekLocal(ctx.days, params.anchorWeekday, ctx.timeZone);
  if (!anchorYmd) return [];
  if (isStationClosed(ctx.holidays, anchorYmd)) return [];

  const anchorLabel = weekdayLabel(params.anchorWeekday);
  const worksAnchor = hasShift(ctx.entries, person.id, anchorYmd);
  const weekdayOffDates: string[] = [];

  for (const ymd of ctx.days) {
    if (calendarWeekdayIndex(ymd, ctx.timeZone) === params.anchorWeekday) continue;
    if (isStationClosed(ctx.holidays, ymd)) continue;
    if (ctx.blockMap[cellKey(person.id, ymd)]) continue;
    if (!hasShift(ctx.entries, person.id, ymd)) weekdayOffDates.push(ymd);
  }

  if (worksAnchor) {
    if (weekdayOffDates.length < params.weekdayOffCount) {
      return [
        {
          ruleId: rule.id,
          ruleType: rule.type,
          staffId: person.id,
          message: `Works ${anchorLabel} but has no weekday off`,
          dates: [anchorYmd],
        },
      ];
    }
    return [];
  }

  if (!hasShift(ctx.entries, person.id, anchorYmd) && ctx.blockMap[cellKey(person.id, anchorYmd)]) {
    return [];
  }

  if (weekdayOffDates.length > 0) {
    return [
      {
        ruleId: rule.id,
        ruleType: rule.type,
        staffId: person.id,
        message: `${anchorLabel} is off but also has a weekday off`,
        dates: [anchorYmd, ...weekdayOffDates],
      },
    ];
  }

  return [];
};

// ---------------------------------------------------------------------------
// Rule type: rotate_anchor_week
// Params: { anchorWeekday: number }
// ---------------------------------------------------------------------------

export type RotateAnchorParams = {
  anchorWeekday: number;
};

function parseRotateAnchorParams(raw: Record<string, unknown>): RotateAnchorParams {
  const anchorWeekday = typeof raw.anchorWeekday === "number" && Number.isInteger(raw.anchorWeekday) && raw.anchorWeekday >= 0 && raw.anchorWeekday <= 6
    ? raw.anchorWeekday
    : 0;
  return { anchorWeekday };
}

const evaluateRotateAnchor: RuleEvaluator = (rule, person, ctx) => {
  const params = parseRotateAnchorParams(rule.params);
  if (!ctx.workedAnchorLastWeek.has(person.id)) return [];

  const anchorYmd = findCalendarDayInWeekLocal(ctx.days, params.anchorWeekday, ctx.timeZone);
  if (!anchorYmd) return [];
  if (isStationClosed(ctx.holidays, anchorYmd)) return [];
  if (!hasShift(ctx.entries, person.id, anchorYmd)) return [];

  const anchorLabel = weekdayLabel(params.anchorWeekday);
  return [
    {
      ruleId: rule.id,
      ruleType: rule.type,
      staffId: person.id,
      message: `Worked ${anchorLabel} last week — should be off ${anchorLabel} this week`,
      dates: [anchorYmd],
    },
  ];
};

// ---------------------------------------------------------------------------
// Rule type: max_scheduled_days_per_week
// Params: { maxDays: number }
// ---------------------------------------------------------------------------

export type MaxScheduledDaysParams = {
  maxDays: number;
};

function parseMaxScheduledDaysParams(raw: Record<string, unknown>): MaxScheduledDaysParams {
  const maxDays = typeof raw.maxDays === "number" && Number.isInteger(raw.maxDays) && raw.maxDays >= 1
    ? raw.maxDays
    : 5;
  return { maxDays };
}

const evaluateMaxScheduledDays: RuleEvaluator = (rule, person, ctx) => {
  const params = parseMaxScheduledDaysParams(rule.params);

  const scheduledDates: string[] = [];
  for (const ymd of ctx.days) {
    if (isStationClosed(ctx.holidays, ymd)) continue;
    if (hasShift(ctx.entries, person.id, ymd)) scheduledDates.push(ymd);
  }

  if (scheduledDates.length <= params.maxDays) return [];

  return [
    {
      ruleId: rule.id,
      ruleType: rule.type,
      staffId: person.id,
      message: `Scheduled ${scheduledDates.length} days (max ${params.maxDays})`,
      dates: scheduledDates,
    },
  ];
};

// ---------------------------------------------------------------------------
// Rule type: min_staff_with_role_per_day
// Params: { roleNames: string[], minCount: number }
// This is a day-level rule — violations are emitted per day, attributed to
// each qualifying staff member who is NOT scheduled that day so the grid
// can highlight them.
// ---------------------------------------------------------------------------

export type MinStaffWithRoleParams = {
  roleNames: string[];
  minCount: number;
};

function parseMinStaffWithRoleParams(raw: Record<string, unknown>): MinStaffWithRoleParams {
  const roleNames = Array.isArray(raw.roleNames)
    ? (raw.roleNames as string[]).filter((s) => typeof s === "string" && s.trim())
    : ["Supervisor"];
  const minCount = typeof raw.minCount === "number" && Number.isInteger(raw.minCount) && raw.minCount >= 1
    ? raw.minCount
    : 1;
  return { roleNames, minCount };
}

const evaluateMinStaffWithRole: RuleEvaluator = (rule, _person, ctx) => {
  const params = parseMinStaffWithRoleParams(rule.params);
  const roleLabel = params.roleNames.join("/");

  const qualifyingStaff = ctx.staff.filter((s) => staffMatchesRoleNames(s.role, params.roleNames));
  if (qualifyingStaff.length === 0) return [];

  const violations: SchedulingRuleViolation[] = [];
  for (const ymd of ctx.days) {
    if (isStationClosed(ctx.holidays, ymd)) continue;

    const scheduledCount = qualifyingStaff.filter((s) => hasShift(ctx.entries, s.id, ymd)).length;
    if (scheduledCount >= params.minCount) continue;

    const unscheduled = qualifyingStaff.filter(
      (s) => !hasShift(ctx.entries, s.id, ymd) && !ctx.blockMap[cellKey(s.id, ymd)],
    );
    for (const s of unscheduled) {
      if (s.id !== _person.id) continue;
      violations.push({
        ruleId: rule.id,
        ruleType: rule.type,
        staffId: s.id,
        message: `Only ${scheduledCount} ${roleLabel} scheduled (need ${params.minCount})`,
        dates: [ymd],
      });
    }
  }

  return violations;
};

// ---------------------------------------------------------------------------
// Rule type: no_consecutive_work_days
// Params: { maxConsecutive: number }
// ---------------------------------------------------------------------------

export type NoConsecutiveWorkDaysParams = {
  maxConsecutive: number;
};

function parseNoConsecutiveWorkDaysParams(raw: Record<string, unknown>): NoConsecutiveWorkDaysParams {
  const maxConsecutive = typeof raw.maxConsecutive === "number" && Number.isInteger(raw.maxConsecutive) && raw.maxConsecutive >= 1
    ? raw.maxConsecutive
    : 6;
  return { maxConsecutive };
}

const evaluateNoConsecutiveWorkDays: RuleEvaluator = (rule, person, ctx) => {
  const params = parseNoConsecutiveWorkDaysParams(rule.params);

  let streak = 0;
  let streakDates: string[] = [];
  let maxStreak = 0;
  let maxStreakDates: string[] = [];

  for (const ymd of ctx.days) {
    if (isStationClosed(ctx.holidays, ymd)) {
      if (streak > maxStreak) { maxStreak = streak; maxStreakDates = [...streakDates]; }
      streak = 0;
      streakDates = [];
      continue;
    }

    if (hasShift(ctx.entries, person.id, ymd)) {
      streak++;
      streakDates.push(ymd);
    } else {
      if (streak > maxStreak) { maxStreak = streak; maxStreakDates = [...streakDates]; }
      streak = 0;
      streakDates = [];
    }
  }
  if (streak > maxStreak) { maxStreak = streak; maxStreakDates = [...streakDates]; }

  if (maxStreak <= params.maxConsecutive) return [];

  return [
    {
      ruleId: rule.id,
      ruleType: rule.type,
      staffId: person.id,
      message: `${maxStreak} consecutive work days (max ${params.maxConsecutive})`,
      dates: maxStreakDates,
    },
  ];
};

// ---------------------------------------------------------------------------
// Rule type: max_staff_per_day
// Params: { roleNames: string[], maxCount: number }
// Caps how many people with certain roles can be scheduled on a single day.
// ---------------------------------------------------------------------------

export type MaxStaffPerDayParams = {
  roleNames: string[];
  maxCount: number;
};

function parseMaxStaffPerDayParams(raw: Record<string, unknown>): MaxStaffPerDayParams {
  const roleNames = Array.isArray(raw.roleNames)
    ? (raw.roleNames as string[]).filter((s) => typeof s === "string" && s.trim())
    : [];
  const maxCount = typeof raw.maxCount === "number" && Number.isInteger(raw.maxCount) && raw.maxCount >= 1
    ? raw.maxCount
    : 5;
  return { roleNames, maxCount };
}

const evaluateMaxStaffPerDay: RuleEvaluator = (rule, _person, ctx) => {
  const params = parseMaxStaffPerDayParams(rule.params);
  const allRoles = params.roleNames.length === 0;
  const roleLabel = allRoles ? "staff" : params.roleNames.join("/");

  const qualifying = allRoles
    ? ctx.staff
    : ctx.staff.filter((s) => staffMatchesRoleNames(s.role, params.roleNames));
  if (qualifying.length === 0) return [];

  const violations: SchedulingRuleViolation[] = [];
  for (const ymd of ctx.days) {
    if (isStationClosed(ctx.holidays, ymd)) continue;

    const scheduled = qualifying.filter((s) => hasShift(ctx.entries, s.id, ymd));
    if (scheduled.length <= params.maxCount) continue;

    if (scheduled.some((s) => s.id === _person.id)) {
      violations.push({
        ruleId: rule.id,
        ruleType: rule.type,
        staffId: _person.id,
        message: `${scheduled.length} ${roleLabel} on day (max ${params.maxCount})`,
        dates: [ymd],
      });
    }
  }

  return violations;
};

// ---------------------------------------------------------------------------
// Rule type: max_staff_per_shift
// Params: { shiftTemplateIds: string[], maxCount: number }
// Caps how many people can be assigned to specific shifts on any day.
// ---------------------------------------------------------------------------

export type MaxStaffPerShiftParams = {
  shiftTemplateIds: string[];
  maxCount: number;
};

function parseMaxStaffPerShiftParams(raw: Record<string, unknown>): MaxStaffPerShiftParams {
  const shiftTemplateIds = Array.isArray(raw.shiftTemplateIds)
    ? (raw.shiftTemplateIds as string[]).filter((s) => typeof s === "string" && s.trim())
    : [];
  const maxCount = typeof raw.maxCount === "number" && Number.isInteger(raw.maxCount) && raw.maxCount >= 1
    ? raw.maxCount
    : 3;
  return { shiftTemplateIds, maxCount };
}

const evaluateMaxStaffPerShift: RuleEvaluator = (rule, _person, ctx) => {
  const params = parseMaxStaffPerShiftParams(rule.params);
  if (params.shiftTemplateIds.length === 0) return [];
  const templateSet = new Set(params.shiftTemplateIds);

  const violations: SchedulingRuleViolation[] = [];
  for (const ymd of ctx.days) {
    if (isStationClosed(ctx.holidays, ymd)) continue;

    let count = 0;
    let personOnShift = false;
    for (const s of ctx.staff) {
      const tplId = ctx.entries[cellKey(s.id, ymd)];
      if (tplId && templateSet.has(tplId)) {
        count++;
        if (s.id === _person.id) personOnShift = true;
      }
    }

    if (count > params.maxCount && personOnShift) {
      violations.push({
        ruleId: rule.id,
        ruleType: rule.type,
        staffId: _person.id,
        message: `${count} on shift (max ${params.maxCount})`,
        dates: [ymd],
      });
    }
  }

  return violations;
};

// ---------------------------------------------------------------------------
// Rule type: min_staff_per_shift
// Params: { shiftTemplateIds: string[], roleNames: string[], minCount: number }
// Ensures at least N people (optionally with a role) are on specific shifts.
// ---------------------------------------------------------------------------

export type MinStaffPerShiftParams = {
  shiftTemplateIds: string[];
  roleNames: string[];
  minCount: number;
};

function parseMinStaffPerShiftParams(raw: Record<string, unknown>): MinStaffPerShiftParams {
  const shiftTemplateIds = Array.isArray(raw.shiftTemplateIds)
    ? (raw.shiftTemplateIds as string[]).filter((s) => typeof s === "string" && s.trim())
    : [];
  const roleNames = Array.isArray(raw.roleNames)
    ? (raw.roleNames as string[]).filter((s) => typeof s === "string" && s.trim())
    : [];
  const minCount = typeof raw.minCount === "number" && Number.isInteger(raw.minCount) && raw.minCount >= 1
    ? raw.minCount
    : 1;
  return { shiftTemplateIds, roleNames, minCount };
}

const evaluateMinStaffPerShift: RuleEvaluator = (rule, _person, ctx) => {
  const params = parseMinStaffPerShiftParams(rule.params);
  if (params.shiftTemplateIds.length === 0) return [];
  const templateSet = new Set(params.shiftTemplateIds);
  const allRoles = params.roleNames.length === 0;
  const roleLabel = allRoles ? "staff" : params.roleNames.join("/");

  const qualifying = allRoles
    ? ctx.staff
    : ctx.staff.filter((s) => staffMatchesRoleNames(s.role, params.roleNames));
  if (qualifying.length === 0) return [];

  const violations: SchedulingRuleViolation[] = [];
  for (const ymd of ctx.days) {
    if (isStationClosed(ctx.holidays, ymd)) continue;

    const onShift = qualifying.filter((s) => {
      const tplId = ctx.entries[cellKey(s.id, ymd)];
      return tplId && templateSet.has(tplId);
    });

    if (onShift.length >= params.minCount) continue;

    const unscheduledForShift = qualifying.filter((s) => {
      const tplId = ctx.entries[cellKey(s.id, ymd)];
      return (!tplId || !templateSet.has(tplId)) && !ctx.blockMap[cellKey(s.id, ymd)];
    });

    for (const s of unscheduledForShift) {
      if (s.id !== _person.id) continue;
      violations.push({
        ruleId: rule.id,
        ruleType: rule.type,
        staffId: s.id,
        message: `Only ${onShift.length} ${roleLabel} on shift (need ${params.minCount})`,
        dates: [ymd],
      });
    }
  }

  return violations;
};

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const RULE_TEMPLATES: Record<string, RuleTemplateMeta> = {
  role_must_work_on_weekdays: {
    type: "role_must_work_on_weekdays",
    label: "Required coverage by role",
    description: "Certain roles must be scheduled on specific weekdays unless they have an approved day off.",
    category: "coverage",
    defaultParams: { roleNames: ["Supervisor"], weekdays: [5, 6], exceptApprovedDayOff: true },
    evaluate: evaluateRoleMustWork,
  },
  min_staff_with_role_per_day: {
    type: "min_staff_with_role_per_day",
    label: "Minimum staff per day",
    description: "Ensure at least N people with a specific role are scheduled each open day.",
    category: "coverage",
    defaultParams: { roleNames: ["Supervisor"], minCount: 1 },
    evaluate: evaluateMinStaffWithRole,
  },
  min_staff_per_shift: {
    type: "min_staff_per_shift",
    label: "Minimum staff per shift",
    description: "Ensure at least N people (optionally with a role) are assigned to specific shifts each day.",
    category: "coverage",
    defaultParams: { shiftTemplateIds: [], roleNames: [], minCount: 1 },
    evaluate: evaluateMinStaffPerShift,
  },
  max_scheduled_days_per_week: {
    type: "max_scheduled_days_per_week",
    label: "Max days per week",
    description: "Limit how many days a person can be scheduled in a single week.",
    category: "limits",
    defaultParams: { maxDays: 5 },
    evaluate: evaluateMaxScheduledDays,
  },
  max_staff_per_day: {
    type: "max_staff_per_day",
    label: "Max staff per day",
    description: "Cap how many people (optionally with a role) can be scheduled on a single day.",
    category: "limits",
    defaultParams: { roleNames: [], maxCount: 5 },
    evaluate: evaluateMaxStaffPerDay,
  },
  max_staff_per_shift: {
    type: "max_staff_per_shift",
    label: "Max staff per shift",
    description: "Cap how many people can be assigned to specific shifts on any day.",
    category: "limits",
    defaultParams: { shiftTemplateIds: [], maxCount: 3 },
    evaluate: evaluateMaxStaffPerShift,
  },
  no_consecutive_work_days: {
    type: "no_consecutive_work_days",
    label: "Max consecutive work days",
    description: "Prevent scheduling someone for too many days in a row within the week.",
    category: "limits",
    defaultParams: { maxConsecutive: 6 },
    evaluate: evaluateNoConsecutiveWorkDays,
  },
  anchor_xor_weekday_off: {
    type: "anchor_xor_weekday_off",
    label: "Anchor day or weekday off",
    description: "Each person either has the anchor day off, or works the anchor day with at least one weekday off.",
    category: "rotation",
    defaultParams: { anchorWeekday: 0, weekdayOffCount: 1 },
    evaluate: evaluateAnchorXor,
  },
  rotate_anchor_week: {
    type: "rotate_anchor_week",
    label: "Rotate anchor day week to week",
    description: "Staff who worked the anchor day last week should be off that day this week.",
    category: "rotation",
    defaultParams: { anchorWeekday: 0 },
    evaluate: evaluateRotateAnchor,
  },
};

export function getEvaluator(type: string): RuleEvaluator | null {
  return RULE_TEMPLATES[type]?.evaluate ?? null;
}

// ---------------------------------------------------------------------------
// Collect violations from a list of rule records
// ---------------------------------------------------------------------------

export function collectRuleViolations(
  rules: SchedulingRuleRecord[],
  ctx: RuleEvalContext,
): SchedulingRuleViolation[] {
  const violations: SchedulingRuleViolation[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const evaluator = getEvaluator(rule.type);
    if (!evaluator) continue;
    for (const person of ctx.staff) {
      violations.push(...evaluator(rule, person, ctx));
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Helpers for consuming violations (same API shape as before)
// ---------------------------------------------------------------------------

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

export function countStaffWithSchedulingViolations(
  violations: SchedulingRuleViolation[],
): number {
  return new Set(violations.map((v) => v.staffId)).size;
}

// ---------------------------------------------------------------------------
// Filter Auto Scheduler proposals against rules
// ---------------------------------------------------------------------------

export function filterProposalsByRules<
  T extends { staffId: string; date: string; shiftTemplateId: string },
>(args: {
  proposals: T[];
  currentEntries: Map<string, string>;
  rules: SchedulingRuleRecord[];
  ctx: RuleEvalContext;
}): { proposals: T[]; skipped: Array<{ staffId: string; date: string; reason: string }> } {
  if (args.rules.length === 0 || args.rules.every((r) => !r.enabled)) {
    return { proposals: args.proposals, skipped: [] };
  }

  const projected = new Map(args.currentEntries);
  const kept: T[] = [];
  const skipped: Array<{ staffId: string; date: string; reason: string }> = [];

  for (const proposal of args.proposals) {
    projected.set(cellKey(proposal.staffId, proposal.date), proposal.shiftTemplateId);
    const projectedRecord = Object.fromEntries(projected);
    const violations = collectRuleViolations(args.rules, {
      ...args.ctx,
      entries: projectedRecord,
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

// ---------------------------------------------------------------------------
// Convert old SchedulingRulesSettings shape → SchedulingRuleRecord[] for
// backward-compatible consumption. Used during migration period.
// ---------------------------------------------------------------------------

export type LegacySchedulingRulesSettings = {
  enabled: boolean;
  supervisorNoWeekendOff: {
    enabled: boolean;
    roleNames: string[];
    weekdays: number[];
  };
  sundayOrWeekdayOff: {
    enabled: boolean;
    anchorWeekday: number;
    rotateAnchorWeek: boolean;
  };
};

let nextSyntheticId = 0;
function syntheticId(): string {
  return `__legacy_${++nextSyntheticId}`;
}

export function legacySettingsToRules(settings: LegacySchedulingRulesSettings): SchedulingRuleRecord[] {
  if (!settings.enabled) return [];
  const rules: SchedulingRuleRecord[] = [];

  if (settings.supervisorNoWeekendOff.enabled) {
    rules.push({
      id: syntheticId(),
      type: "role_must_work_on_weekdays",
      name: "Supervisor weekend coverage",
      enabled: true,
      sortOrder: 0,
      params: {
        roleNames: settings.supervisorNoWeekendOff.roleNames,
        weekdays: settings.supervisorNoWeekendOff.weekdays,
        exceptApprovedDayOff: true,
      },
    });
  }

  if (settings.sundayOrWeekdayOff.enabled) {
    rules.push({
      id: syntheticId(),
      type: "anchor_xor_weekday_off",
      name: `${weekdayLabel(settings.sundayOrWeekdayOff.anchorWeekday)} or weekday off`,
      enabled: true,
      sortOrder: 1,
      params: {
        anchorWeekday: settings.sundayOrWeekdayOff.anchorWeekday,
        weekdayOffCount: 1,
      },
    });

    if (settings.sundayOrWeekdayOff.rotateAnchorWeek) {
      rules.push({
        id: syntheticId(),
        type: "rotate_anchor_week",
        name: `Rotate ${weekdayLabel(settings.sundayOrWeekdayOff.anchorWeekday)} week to week`,
        enabled: true,
        sortOrder: 2,
        params: {
          anchorWeekday: settings.sundayOrWeekdayOff.anchorWeekday,
        },
      });
    }
  }

  return rules;
}
