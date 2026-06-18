import { prisma } from "@/lib/prisma";
import {
  FREE_ADMINS_MAX,
  FREE_DEVICE_SLOTS,
  FREE_LOCATIONS_MAX,
  FREE_STAFF_MAX,
  isFreePlan,
  type PlanLimitViolation,
} from "@/lib/plans";

type OrgPlanContext = {
  plan: string | null;
  isDemo: boolean;
};

async function loadOrgPlanContext(organizationId: string): Promise<OrgPlanContext | null> {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, isDemo: true },
  });
}

function limitsApply(ctx: OrgPlanContext): boolean {
  return isFreePlan(ctx.plan) && !ctx.isDemo;
}

/** Returns a violation when adding another staff member would exceed the free cap. */
export async function checkStaffLimit(
  organizationId: string,
): Promise<PlanLimitViolation | null> {
  const org = await loadOrgPlanContext(organizationId);
  if (!org || !limitsApply(org)) return null;

  const count = await prisma.staff.count({
    where: { organizationId, archivedAt: null },
  });
  if (count >= FREE_STAFF_MAX) {
    return {
      kind: "staff",
      message: `Free plan includes up to ${FREE_STAFF_MAX} staff. Upgrade to Plus for up to 100 staff.`,
      upgradeCta: "Upgrade to Plus",
    };
  }
  return null;
}

/** Soft block at location #3 on free tier. */
export async function checkLocationLimit(
  organizationId: string,
): Promise<PlanLimitViolation | null> {
  const org = await loadOrgPlanContext(organizationId);
  if (!org || !limitsApply(org)) return null;

  const count = await prisma.location.count({ where: { organizationId } });
  if (count >= FREE_LOCATIONS_MAX) {
    return {
      kind: "location",
      message: `Free plan includes up to ${FREE_LOCATIONS_MAX} locations. Upgrade to Plus for unlimited locations.`,
      upgradeCta: "Upgrade to Plus",
    };
  }
  return null;
}

/** Hard block when registering another device on free tier. */
export async function checkDeviceSlotLimit(
  organizationId: string,
): Promise<PlanLimitViolation | null> {
  const org = await loadOrgPlanContext(organizationId);
  if (!org || !limitsApply(org)) return null;

  const count = await prisma.device.count({
    where: { organizationId, deletedAt: null },
  });
  if (count >= FREE_DEVICE_SLOTS) {
    return {
      kind: "device",
      message: `Free plan includes ${FREE_DEVICE_SLOTS} device slot. Upgrade to Plus for live attendance sync.`,
      upgradeCta: "Upgrade to Plus",
    };
  }
  return null;
}

export async function countAdmins(organizationId: string): Promise<number> {
  return prisma.appUser.count({ where: { organizationId } });
}

export function adminLimitViolation(currentCount: number): PlanLimitViolation | null {
  if (currentCount >= FREE_ADMINS_MAX) {
    return {
      kind: "admin",
      message: `Free plan includes ${FREE_ADMINS_MAX} admin login. Upgrade to Plus for a second admin.`,
      upgradeCta: "Upgrade to Plus",
    };
  }
  return null;
}
