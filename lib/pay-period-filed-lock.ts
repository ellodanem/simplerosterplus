import { prisma } from "./prisma";
import { utcDateFromYmd } from "./datetime-policy";
import { daysOfWeek, shiftYmd } from "./roster-week";
import { payPeriodToYmd } from "./pay-period-db";

export const FILED_PERIOD_EDIT_ERROR =
  "This date was filed in an Extract Pay Period and cannot be changed.";

/** True when `ymd` falls inside any saved pay period for this location. */
export async function isYmdFiledInPayPeriod(
  locationId: string,
  ymd: string,
): Promise<boolean> {
  const day = utcDateFromYmd(ymd);
  const count = await prisma.payPeriod.count({
    where: {
      locationId,
      startDate: { lte: day },
      endDate: { gte: day },
    },
  });
  return count > 0;
}

/** Calendar days in `[weekStartYmd, weekStartYmd+6]` that lie in a filed pay period. */
export async function getFiledYmdsForWeek(
  locationId: string,
  weekStartYmd: string,
): Promise<string[]> {
  const weekEndYmd = shiftYmd(weekStartYmd, 6);
  const periods = await prisma.payPeriod.findMany({
    where: {
      locationId,
      startDate: { lte: utcDateFromYmd(weekEndYmd) },
      endDate: { gte: utcDateFromYmd(weekStartYmd) },
    },
    select: { startDate: true, endDate: true },
  });
  if (periods.length === 0) return [];

  const filed = new Set<string>();
  for (const period of periods) {
    const pStart = payPeriodToYmd(period.startDate);
    const pEnd = payPeriodToYmd(period.endDate);
    for (const d of daysOfWeek(weekStartYmd)) {
      if (d >= pStart && d <= pEnd) filed.add(d);
    }
  }
  return [...filed].sort();
}
