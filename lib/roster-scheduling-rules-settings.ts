import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SUNDAY_ANCHOR_WEEKDAY,
  DEFAULT_SUPERVISOR_ROLE_NAMES,
  DEFAULT_SUPERVISOR_WEEKDAYS,
  formatRoleNamesCsv,
  formatWeekdayList,
  parseRoleNamesCsv,
  parseSundayAnchorWeekday,
  parseWeekdayList,
  SCHEDULING_RULES_DEFAULTS,
  SCHEDULING_RULES_ENABLED_KEY,
  SCHEDULING_RULES_SUNDAY_ANCHOR_WEEKDAY_KEY,
  SCHEDULING_RULES_SUNDAY_PATTERN_ENABLED_KEY,
  SCHEDULING_RULES_SUPERVISOR_ENABLED_KEY,
  SCHEDULING_RULES_SUPERVISOR_ROLES_KEY,
  SCHEDULING_RULES_SUPERVISOR_WEEKDAYS_KEY,
  type SchedulingRulesSettings,
} from "@/lib/roster-scheduling-rules";

function parseEnabled(value: string | null | undefined): boolean {
  if (value == null || value === "") return false;
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

export async function getSchedulingRulesSettings(
  organizationId: string,
): Promise<SchedulingRulesSettings> {
  const rows = await prisma.appSetting.findMany({
    where: {
      organizationId,
      key: {
        in: [
          SCHEDULING_RULES_ENABLED_KEY,
          SCHEDULING_RULES_SUPERVISOR_ENABLED_KEY,
          SCHEDULING_RULES_SUPERVISOR_ROLES_KEY,
          SCHEDULING_RULES_SUPERVISOR_WEEKDAYS_KEY,
          SCHEDULING_RULES_SUNDAY_PATTERN_ENABLED_KEY,
          SCHEDULING_RULES_SUNDAY_ANCHOR_WEEKDAY_KEY,
        ],
      },
    },
    select: { key: true, value: true },
  });

  const values = new Map(rows.map((row) => [row.key, row.value] as const));
  const enabled = parseEnabled(values.get(SCHEDULING_RULES_ENABLED_KEY));
  const supervisorEnabled = parseEnabled(values.get(SCHEDULING_RULES_SUPERVISOR_ENABLED_KEY));
  const sundayEnabled = parseEnabled(values.get(SCHEDULING_RULES_SUNDAY_PATTERN_ENABLED_KEY));

  if (!enabled && rows.length === 0) {
    return { ...SCHEDULING_RULES_DEFAULTS };
  }

  return {
    enabled,
    supervisorNoWeekendOff: {
      enabled: supervisorEnabled,
      roleNames: parseRoleNamesCsv(values.get(SCHEDULING_RULES_SUPERVISOR_ROLES_KEY)),
      weekdays: parseWeekdayList(values.get(SCHEDULING_RULES_SUPERVISOR_WEEKDAYS_KEY)),
    },
    sundayOrWeekdayOff: {
      enabled: sundayEnabled,
      anchorWeekday: parseSundayAnchorWeekday(
        values.get(SCHEDULING_RULES_SUNDAY_ANCHOR_WEEKDAY_KEY),
      ),
    },
  };
}

export async function saveSchedulingRulesSettings(
  organizationId: string,
  settings: SchedulingRulesSettings,
): Promise<SchedulingRulesSettings> {
  const entries: Array<{ key: string; value: string }> = [
    { key: SCHEDULING_RULES_ENABLED_KEY, value: settings.enabled ? "true" : "false" },
    {
      key: SCHEDULING_RULES_SUPERVISOR_ENABLED_KEY,
      value: settings.supervisorNoWeekendOff.enabled ? "true" : "false",
    },
    {
      key: SCHEDULING_RULES_SUPERVISOR_ROLES_KEY,
      value: formatRoleNamesCsv(
        settings.supervisorNoWeekendOff.roleNames.length > 0
          ? settings.supervisorNoWeekendOff.roleNames
          : [...DEFAULT_SUPERVISOR_ROLE_NAMES],
      ),
    },
    {
      key: SCHEDULING_RULES_SUPERVISOR_WEEKDAYS_KEY,
      value: formatWeekdayList(
        settings.supervisorNoWeekendOff.weekdays.length > 0
          ? settings.supervisorNoWeekendOff.weekdays
          : [...DEFAULT_SUPERVISOR_WEEKDAYS],
      ),
    },
    {
      key: SCHEDULING_RULES_SUNDAY_PATTERN_ENABLED_KEY,
      value: settings.sundayOrWeekdayOff.enabled ? "true" : "false",
    },
    {
      key: SCHEDULING_RULES_SUNDAY_ANCHOR_WEEKDAY_KEY,
      value: String(settings.sundayOrWeekdayOff.anchorWeekday ?? DEFAULT_SUNDAY_ANCHOR_WEEKDAY),
    },
  ];

  await Promise.all(
    entries.map((entry) =>
      prisma.appSetting.upsert({
        where: {
          organizationId_key: { organizationId, key: entry.key },
        },
        create: { organizationId, key: entry.key, value: entry.value },
        update: { value: entry.value },
      }),
    ),
  );

  return getSchedulingRulesSettings(organizationId);
}
