import { prisma } from "@/lib/prisma";
import { formatYmdInZone } from "@/lib/datetime-policy";

const USAGE_KEY_PREFIX = "auto_scheduler.usage.";

function usageKeyForMonth(timeZone: string, now = new Date()): string {
  const ymd = formatYmdInZone(now, timeZone);
  const [year, month] = ymd.split("-");
  return `${USAGE_KEY_PREFIX}${year}-${month}`;
}

export async function getAutoSchedulerUsageCount(
  organizationId: string,
  timeZone: string,
): Promise<number> {
  const key = usageKeyForMonth(timeZone);
  const row = await prisma.appSetting.findUnique({
    where: { organizationId_key: { organizationId, key } },
    select: { value: true },
  });
  if (!row?.value) return 0;
  const n = Number(row.value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Increment monthly apply counter (tracking only in Phase 1 — no billing gate). */
export async function incrementAutoSchedulerUsage(
  organizationId: string,
  timeZone: string,
): Promise<number> {
  const key = usageKeyForMonth(timeZone);
  const current = await getAutoSchedulerUsageCount(organizationId, timeZone);
  const next = current + 1;
  await prisma.appSetting.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, value: String(next) },
    update: { value: String(next) },
  });
  return next;
}
