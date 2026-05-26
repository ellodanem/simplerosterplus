import { prisma } from "@/lib/prisma";
import {
  parseOvertimeEnabled,
  parseOvertimeThresholdHours,
  type OvertimeSettings,
} from "@/lib/overtime";

export const OVERTIME_ENABLED_KEY = "overtime_alerts_enabled";
export const OVERTIME_WEEKLY_THRESHOLD_KEY = "overtime_weekly_threshold_hours";

export async function getOvertimeSettings(organizationId: string): Promise<OvertimeSettings> {
  const rows = await prisma.appSetting.findMany({
    where: {
      organizationId,
      key: {
        in: [OVERTIME_ENABLED_KEY, OVERTIME_WEEKLY_THRESHOLD_KEY],
      },
    },
    select: { key: true, value: true },
  });

  const values = new Map(rows.map((row) => [row.key, row.value] as const));
  return {
    enabled: parseOvertimeEnabled(values.get(OVERTIME_ENABLED_KEY)),
    weeklyThresholdHours: parseOvertimeThresholdHours(
      values.get(OVERTIME_WEEKLY_THRESHOLD_KEY),
    ),
  };
}
