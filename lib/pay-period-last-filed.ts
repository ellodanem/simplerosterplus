import { prisma } from "./prisma";
import { shiftYmdLocal } from "./datetime-policy";
import { ymdForDbDate } from "./roster-week";

/** First calendar day after the latest saved period's end (for log default window). */
export async function getLastFiledCutoffYmd(locationId: string): Promise<string | null> {
  const latest = await prisma.payPeriod.findFirst({
    where: { locationId },
    orderBy: [{ endDate: "desc" }, { createdAt: "desc" }],
    select: { endDate: true },
  });
  if (!latest) return null;
  return shiftYmdLocal(ymdForDbDate(latest.endDate), 1);
}

export async function getLatestFiledPayPeriod(locationId: string) {
  return prisma.payPeriod.findFirst({
    where: { locationId },
    orderBy: [{ endDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      startDate: true,
      endDate: true,
      createdAt: true,
    },
  });
}
