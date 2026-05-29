import { prisma } from "@/lib/prisma";
import {
  parseMinimumOffDays,
  parseMinimumOffDaysEnabled,
  type MinimumOffDaysSettings,
} from "@/lib/minimum-off-days";

export const MINIMUM_OFF_DAYS_ENABLED_KEY = "roster_minimum_off_days_enabled";
export const MINIMUM_OFF_DAYS_KEY = "roster_minimum_off_days";

export async function getMinimumOffDaysSettings(
  organizationId: string,
): Promise<MinimumOffDaysSettings> {
  const rows = await prisma.appSetting.findMany({
    where: {
      organizationId,
      key: {
        in: [MINIMUM_OFF_DAYS_ENABLED_KEY, MINIMUM_OFF_DAYS_KEY],
      },
    },
    select: { key: true, value: true },
  });

  const values = new Map(rows.map((row) => [row.key, row.value] as const));
  return {
    enabled: parseMinimumOffDaysEnabled(values.get(MINIMUM_OFF_DAYS_ENABLED_KEY)),
    minimumOffDays: parseMinimumOffDays(values.get(MINIMUM_OFF_DAYS_KEY)),
  };
}
