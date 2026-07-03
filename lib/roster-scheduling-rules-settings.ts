import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SUNDAY_ANCHOR_WEEKDAY,
  DEFAULT_SUPERVISOR_ROLE_NAMES,
  DEFAULT_SUPERVISOR_WEEKDAYS,
  SCHEDULING_RULES_DEFAULTS,
  type SchedulingRulesSettings,
} from "@/lib/roster-scheduling-rules";
import type { SchedulingRuleRecord } from "@/lib/scheduling-rule-registry";

// ---------------------------------------------------------------------------
// Read rules from SchedulingRule table
// ---------------------------------------------------------------------------

export async function getSchedulingRules(
  organizationId: string,
): Promise<SchedulingRuleRecord[]> {
  const rows = await prisma.schedulingRule.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    name: r.name,
    enabled: r.enabled,
    sortOrder: r.sortOrder,
    params: (r.params && typeof r.params === "object" && !Array.isArray(r.params)
      ? r.params
      : {}) as Record<string, unknown>,
  }));
}

// ---------------------------------------------------------------------------
// Materialize the legacy SchedulingRulesSettings shape from rule records
// (used by page.tsx, roster-grid.tsx, and other callers that still expect it)
// ---------------------------------------------------------------------------

export function rulesToLegacySettings(rules: SchedulingRuleRecord[]): SchedulingRulesSettings {
  const hasEnabled = rules.some((r) => r.enabled);

  const supervisorRule = rules.find((r) => r.type === "role_must_work_on_weekdays");
  const anchorRule = rules.find((r) => r.type === "anchor_xor_weekday_off");
  const rotateRule = rules.find((r) => r.type === "rotate_anchor_week");

  const supervisorParams = supervisorRule?.params ?? {};
  const anchorParams = anchorRule?.params ?? {};
  const rotateParams = rotateRule?.params ?? {};

  const anchorWeekday = typeof anchorParams.anchorWeekday === "number"
    ? anchorParams.anchorWeekday
    : typeof rotateParams.anchorWeekday === "number"
      ? rotateParams.anchorWeekday
      : DEFAULT_SUNDAY_ANCHOR_WEEKDAY;

  return {
    enabled: hasEnabled,
    supervisorNoWeekendOff: {
      enabled: supervisorRule?.enabled ?? false,
      roleNames: Array.isArray(supervisorParams.roleNames)
        ? (supervisorParams.roleNames as string[])
        : [...DEFAULT_SUPERVISOR_ROLE_NAMES],
      weekdays: Array.isArray(supervisorParams.weekdays)
        ? (supervisorParams.weekdays as number[])
        : [...DEFAULT_SUPERVISOR_WEEKDAYS],
    },
    sundayOrWeekdayOff: {
      enabled: anchorRule?.enabled ?? false,
      anchorWeekday,
      rotateAnchorWeek: rotateRule?.enabled ?? false,
    },
  };
}

export async function getSchedulingRulesSettings(
  organizationId: string,
): Promise<SchedulingRulesSettings> {
  const rules = await getSchedulingRules(organizationId);
  if (rules.length === 0) return { ...SCHEDULING_RULES_DEFAULTS };
  return rulesToLegacySettings(rules);
}

// ---------------------------------------------------------------------------
// Save: accept legacy settings shape → upsert SchedulingRule rows
// ---------------------------------------------------------------------------

export async function saveSchedulingRulesSettings(
  organizationId: string,
  settings: SchedulingRulesSettings,
): Promise<SchedulingRulesSettings> {
  const existing = await prisma.schedulingRule.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
  });

  const byType = new Map(existing.map((r) => [r.type, r]));

  // --- role_must_work_on_weekdays ---
  const supervisorRow = byType.get("role_must_work_on_weekdays");
  const supervisorParams = {
    roleNames: settings.supervisorNoWeekendOff.roleNames.length > 0
      ? settings.supervisorNoWeekendOff.roleNames
      : [...DEFAULT_SUPERVISOR_ROLE_NAMES],
    weekdays: settings.supervisorNoWeekendOff.weekdays.length > 0
      ? settings.supervisorNoWeekendOff.weekdays
      : [...DEFAULT_SUPERVISOR_WEEKDAYS],
    exceptApprovedDayOff: true,
  };

  if (supervisorRow) {
    await prisma.schedulingRule.update({
      where: { id: supervisorRow.id },
      data: {
        enabled: settings.enabled && settings.supervisorNoWeekendOff.enabled,
        params: supervisorParams,
      },
    });
  } else if (settings.supervisorNoWeekendOff.enabled) {
    await prisma.schedulingRule.create({
      data: {
        organizationId,
        type: "role_must_work_on_weekdays",
        name: "Supervisor weekend coverage",
        enabled: settings.enabled && settings.supervisorNoWeekendOff.enabled,
        sortOrder: 0,
        params: supervisorParams,
      },
    });
  }

  // --- anchor_xor_weekday_off ---
  const anchorRow = byType.get("anchor_xor_weekday_off");
  const anchorParams = {
    anchorWeekday: settings.sundayOrWeekdayOff.anchorWeekday ?? DEFAULT_SUNDAY_ANCHOR_WEEKDAY,
    weekdayOffCount: 1,
  };

  if (anchorRow) {
    await prisma.schedulingRule.update({
      where: { id: anchorRow.id },
      data: {
        enabled: settings.enabled && settings.sundayOrWeekdayOff.enabled,
        params: anchorParams,
      },
    });
  } else if (settings.sundayOrWeekdayOff.enabled) {
    await prisma.schedulingRule.create({
      data: {
        organizationId,
        type: "anchor_xor_weekday_off",
        name: "Anchor day or weekday off",
        enabled: settings.enabled && settings.sundayOrWeekdayOff.enabled,
        sortOrder: 1,
        params: anchorParams,
      },
    });
  }

  // --- rotate_anchor_week ---
  const rotateRow = byType.get("rotate_anchor_week");
  const rotateParams = {
    anchorWeekday: settings.sundayOrWeekdayOff.anchorWeekday ?? DEFAULT_SUNDAY_ANCHOR_WEEKDAY,
  };

  if (rotateRow) {
    await prisma.schedulingRule.update({
      where: { id: rotateRow.id },
      data: {
        enabled: settings.enabled && settings.sundayOrWeekdayOff.enabled && settings.sundayOrWeekdayOff.rotateAnchorWeek,
        params: rotateParams,
      },
    });
  } else if (settings.sundayOrWeekdayOff.rotateAnchorWeek) {
    await prisma.schedulingRule.create({
      data: {
        organizationId,
        type: "rotate_anchor_week",
        name: "Rotate anchor day week to week",
        enabled: settings.enabled && settings.sundayOrWeekdayOff.enabled && settings.sundayOrWeekdayOff.rotateAnchorWeek,
        sortOrder: 2,
        params: rotateParams,
      },
    });
  }

  return getSchedulingRulesSettings(organizationId);
}
