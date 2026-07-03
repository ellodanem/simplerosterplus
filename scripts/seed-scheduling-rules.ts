/**
 * One-time migration: read scheduling-rule toggles from AppSetting rows and
 * create equivalent SchedulingRule records. Idempotent — skips orgs that
 * already have SchedulingRule rows.
 *
 * Usage:  npx tsx scripts/seed-scheduling-rules.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SETTING_KEYS = [
  "roster_scheduling_rules_enabled",
  "roster_scheduling_rules_supervisor_enabled",
  "roster_scheduling_rules_supervisor_roles",
  "roster_scheduling_rules_supervisor_weekdays",
  "roster_scheduling_rules_sunday_pattern_enabled",
  "roster_scheduling_rules_sunday_anchor_weekday",
  "roster_scheduling_rules_sunday_rotation_enabled",
] as const;

function isEnabled(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseRoles(value: string | undefined): string[] {
  if (!value?.trim()) return ["Supervisor"];
  const names = value.split(",").map((s) => s.trim()).filter(Boolean);
  return names.length > 0 ? names : ["Supervisor"];
}

function parseWeekdays(value: string | undefined): number[] {
  if (!value?.trim()) return [5, 6];
  const parsed = value.split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return parsed.length > 0 ? parsed : [5, 6];
}

function parseAnchorWeekday(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : 0;
}

async function main() {
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: [...SETTING_KEYS] } },
    select: { organizationId: true, key: true, value: true },
  });

  const byOrg = new Map<string, Map<string, string>>();
  for (const row of settings) {
    let orgMap = byOrg.get(row.organizationId);
    if (!orgMap) {
      orgMap = new Map();
      byOrg.set(row.organizationId, orgMap);
    }
    orgMap.set(row.key, row.value);
  }

  let created = 0;
  let skipped = 0;

  for (const [orgId, values] of byOrg) {
    const existing = await prisma.schedulingRule.count({
      where: { organizationId: orgId },
    });
    if (existing > 0) {
      skipped++;
      continue;
    }

    const masterEnabled = isEnabled(values.get("roster_scheduling_rules_enabled"));
    const supervisorEnabled = isEnabled(values.get("roster_scheduling_rules_supervisor_enabled"));
    const sundayEnabled = isEnabled(values.get("roster_scheduling_rules_sunday_pattern_enabled"));
    const rotationEnabled = isEnabled(values.get("roster_scheduling_rules_sunday_rotation_enabled"));

    const roleNames = parseRoles(values.get("roster_scheduling_rules_supervisor_roles"));
    const weekdays = parseWeekdays(values.get("roster_scheduling_rules_supervisor_weekdays"));
    const anchorWeekday = parseAnchorWeekday(values.get("roster_scheduling_rules_sunday_anchor_weekday"));

    const toCreate: Array<{
      organizationId: string;
      type: string;
      name: string;
      enabled: boolean;
      sortOrder: number;
      params: object;
    }> = [];

    if (supervisorEnabled) {
      toCreate.push({
        organizationId: orgId,
        type: "role_must_work_on_weekdays",
        name: "Supervisor weekend coverage",
        enabled: masterEnabled && supervisorEnabled,
        sortOrder: 0,
        params: { roleNames, weekdays, exceptApprovedDayOff: true },
      });
    }

    if (sundayEnabled) {
      toCreate.push({
        organizationId: orgId,
        type: "anchor_xor_weekday_off",
        name: "Anchor day or weekday off",
        enabled: masterEnabled && sundayEnabled,
        sortOrder: 1,
        params: { anchorWeekday, weekdayOffCount: 1 },
      });

      if (rotationEnabled) {
        toCreate.push({
          organizationId: orgId,
          type: "rotate_anchor_week",
          name: "Rotate anchor day week to week",
          enabled: masterEnabled && sundayEnabled && rotationEnabled,
          sortOrder: 2,
          params: { anchorWeekday },
        });
      }
    }

    if (toCreate.length > 0) {
      await prisma.schedulingRule.createMany({ data: toCreate });
      created += toCreate.length;
      console.log(`  ${orgId}: created ${toCreate.length} rule(s)`);
    }
  }

  console.log(`\nDone. Created ${created} rule(s), skipped ${skipped} org(s) that already had rules.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
