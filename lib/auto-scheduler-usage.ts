import { prisma } from "@/lib/prisma";
import { resolveBillingTier } from "@/lib/billing-access";
import { formatYmdInZone } from "@/lib/datetime-policy";
import { FREE_AUTO_SCHEDULER_MONTHLY } from "@/lib/plans";

const USAGE_KEY_PREFIX = "auto_scheduler.usage.";

export type AutoSchedulerQuota = {
  allowed: boolean;
  used: number;
  limit: number | null;
  message: string | null;
};

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

export async function getAutoSchedulerQuota(
  organizationId: string,
  timeZone: string,
): Promise<AutoSchedulerQuota> {
  const [used, org] = await Promise.all([
    getAutoSchedulerUsageCount(organizationId, timeZone),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        plan: true,
        isDemo: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        suspendedAt: true,
      },
    }),
  ]);

  if (!org) {
    return { allowed: false, used, limit: null, message: "Organization not found." };
  }

  const tier = resolveBillingTier(org);
  if (tier !== "free") {
    return { allowed: true, used, limit: null, message: null };
  }

  const limit = FREE_AUTO_SCHEDULER_MONTHLY;
  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      message: `Free plan includes ${limit} Auto Scheduler actions per month. Upgrade to Plus for unlimited use.`,
    };
  }

  return { allowed: true, used, limit, message: null };
}

/** Increment monthly apply counter after a successful apply. */
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
