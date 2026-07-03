import { prisma } from "@/lib/prisma";
import { resolveBillingTier, type OrgBillingSnapshot } from "@/lib/billing-access";
import {
  FREE_ADMINS_MAX,
  FREE_DEVICE_SLOTS,
  FREE_LOCATIONS_MAX,
  FREE_STAFF_MAX,
  PLUS_ADMINS_INCLUDED,
  PLUS_DEVICES_INCLUDED,
  PLUS_STAFF_MAX,
  PLUS_STAFF_WARN_80,
  PLUS_STAFF_WARN_95,
  PRO_ADMINS_INCLUDED,
  PRO_DEVICES_INCLUDED,
  PLAN_PLUS,
  PLAN_PRO,
  type PlanLimitViolation,
  type PlanLimitWarning,
} from "@/lib/plans";

type OrgPlanContext = OrgBillingSnapshot & {
  addonDeviceQty: number;
  addonAdminQty: number;
  addonWhatsapp: boolean;
};

async function loadOrgPlanContext(organizationId: string): Promise<OrgPlanContext | null> {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      plan: true,
      isDemo: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      suspendedAt: true,
      addonDeviceQty: true,
      addonAdminQty: true,
      addonWhatsapp: true,
    },
  });
}

function tierLimits(tier: ReturnType<typeof resolveBillingTier>) {
  switch (tier) {
    case "demo":
      return null;
    case "free":
      return {
        staffMax: FREE_STAFF_MAX,
        locationMax: FREE_LOCATIONS_MAX,
        adminsIncluded: FREE_ADMINS_MAX,
        devicesIncluded: FREE_DEVICE_SLOTS,
      };
    case "plus":
      return {
        staffMax: PLUS_STAFF_MAX,
        locationMax: null as number | null,
        adminsIncluded: PLUS_ADMINS_INCLUDED,
        devicesIncluded: PLUS_DEVICES_INCLUDED,
      };
    case "pro":
      return {
        staffMax: null as number | null,
        locationMax: null,
        adminsIncluded: PRO_ADMINS_INCLUDED,
        devicesIncluded: PRO_DEVICES_INCLUDED,
      };
  }
}

function maxDevices(ctx: OrgPlanContext, tier: ReturnType<typeof resolveBillingTier>): number {
  const limits = tierLimits(tier);
  if (!limits) return Number.MAX_SAFE_INTEGER;
  return limits.devicesIncluded + ctx.addonDeviceQty;
}

function maxAdmins(ctx: OrgPlanContext, tier: ReturnType<typeof resolveBillingTier>): number {
  const limits = tierLimits(tier);
  if (!limits) return Number.MAX_SAFE_INTEGER;
  return limits.adminsIncluded + ctx.addonAdminQty;
}

/** Returns a violation when adding another staff member would exceed the cap. */
export async function checkStaffLimit(
  organizationId: string,
): Promise<PlanLimitViolation | null> {
  const org = await loadOrgPlanContext(organizationId);
  if (!org) return null;
  const tier = resolveBillingTier(org);
  const limits = tierLimits(tier);
  if (!limits?.staffMax) return null;

  const count = await prisma.staff.count({
    where: { organizationId, archivedAt: null },
  });
  if (count >= limits.staffMax) {
    if (tier === "free") {
      return {
        kind: "staff",
        message: `Free plan includes up to ${FREE_STAFF_MAX} staff. Upgrade to Plus for up to ${PLUS_STAFF_MAX} staff.`,
        upgradeCta: "Upgrade to Plus",
        upgradePlan: PLAN_PLUS,
      };
    }
    return {
      kind: "staff",
      message: `Plus plan includes up to ${PLUS_STAFF_MAX} staff. Upgrade to Pro for unlimited staff.`,
      upgradeCta: "Upgrade to Pro",
      upgradePlan: PLAN_PRO,
    };
  }
  return null;
}

/** Soft block at location #3 on free tier. */
export async function checkLocationLimit(
  organizationId: string,
): Promise<PlanLimitViolation | null> {
  const org = await loadOrgPlanContext(organizationId);
  if (!org) return null;
  const tier = resolveBillingTier(org);
  const limits = tierLimits(tier);
  if (!limits?.locationMax) return null;

  const count = await prisma.location.count({ where: { organizationId } });
  if (count >= limits.locationMax) {
    return {
      kind: "location",
      message: `Free plan includes up to ${FREE_LOCATIONS_MAX} locations. Upgrade to Plus for unlimited locations.`,
      upgradeCta: "Upgrade to Plus",
      upgradePlan: PLAN_PLUS,
    };
  }
  return null;
}

/** Hard block when registering another device beyond plan allowance. */
export async function checkDeviceSlotLimit(
  organizationId: string,
): Promise<PlanLimitViolation | null> {
  const org = await loadOrgPlanContext(organizationId);
  if (!org) return null;
  const tier = resolveBillingTier(org);
  if (tier === "demo") return null;

  const count = await prisma.device.count({
    where: { organizationId, deletedAt: null },
  });
  const allowed = maxDevices(org, tier);
  if (count >= allowed) {
    if (tier === "free") {
      return {
        kind: "device",
        message: `Free plan includes ${FREE_DEVICE_SLOTS} device slot. Upgrade to Plus for live attendance sync.`,
        upgradeCta: "Upgrade to Plus",
        upgradePlan: PLAN_PLUS,
      };
    }
    return {
      kind: "device",
      message: `Your plan includes ${allowed} device${allowed === 1 ? "" : "s"}. Add a device add-on or upgrade in Settings.`,
      upgradeCta: "Manage billing",
    };
  }
  return null;
}

export async function countAdmins(organizationId: string): Promise<number> {
  return prisma.appUser.count({ where: { organizationId } });
}

/** Hard block when adding another admin login beyond plan allowance. */
export async function checkAdminLimit(
  organizationId: string,
): Promise<PlanLimitViolation | null> {
  const org = await loadOrgPlanContext(organizationId);
  if (!org) return null;
  const tier = resolveBillingTier(org);
  if (tier === "demo") return null;

  const count = await countAdmins(organizationId);
  const allowed = maxAdmins(org, tier);
  if (count >= allowed) {
    if (tier === "free") {
      return {
        kind: "admin",
        message: `Free plan includes ${FREE_ADMINS_MAX} admin login. Upgrade to Plus for a second admin.`,
        upgradeCta: "Upgrade to Plus",
        upgradePlan: PLAN_PLUS,
      };
    }
    return {
      kind: "admin",
      message: `Your plan includes ${allowed} admin logins. Add an admin add-on or upgrade in Settings.`,
      upgradeCta: "Manage billing",
    };
  }
  return null;
}

export type PlanUsageSnapshot = {
  tier: ReturnType<typeof resolveBillingTier>;
  staff: number;
  locations: number;
  admins: number;
  devices: number;
  limits: {
    staffMax: number | null;
    locationMax: number | null;
    adminsIncluded: number;
    devicesIncluded: number;
    devicesAllowed: number;
    adminsAllowed: number;
  };
  warnings: PlanLimitWarning[];
};

export async function getPlanUsage(organizationId: string): Promise<PlanUsageSnapshot | null> {
  const org = await loadOrgPlanContext(organizationId);
  if (!org) return null;

  const tier = resolveBillingTier(org);
  const limits = tierLimits(tier);
  const [staff, locations, admins, devices] = await Promise.all([
    prisma.staff.count({ where: { organizationId, archivedAt: null } }),
    prisma.location.count({ where: { organizationId } }),
    countAdmins(organizationId),
    prisma.device.count({ where: { organizationId, deletedAt: null } }),
  ]);

  const warnings: PlanLimitWarning[] = [];
  if (tier === "free" && locations >= FREE_LOCATIONS_MAX) {
    warnings.push({
      kind: "location",
      severity: "warn",
      message: `You're at the free plan limit of ${FREE_LOCATIONS_MAX} locations. Upgrade to Plus for unlimited locations.`,
    });
  }
  if (tier === "plus" && staff >= PLUS_STAFF_WARN_80) {
    warnings.push({
      kind: "staff",
      severity: staff >= PLUS_STAFF_WARN_95 ? "warn" : "info",
      message:
        staff >= PLUS_STAFF_WARN_95
          ? `You're at ${staff} of ${PLUS_STAFF_MAX} staff on Plus. Upgrade to Pro before you hit the cap.`
          : `You're at ${staff} of ${PLUS_STAFF_MAX} staff on Plus.`,
    });
  }

  const devicesAllowed = maxDevices(org, tier);
  const adminsAllowed = maxAdmins(org, tier);

  return {
    tier,
    staff,
    locations,
    admins,
    devices,
    limits: {
      staffMax: limits?.staffMax ?? null,
      locationMax: limits?.locationMax ?? null,
      adminsIncluded: limits?.adminsIncluded ?? 0,
      devicesIncluded: limits?.devicesIncluded ?? 0,
      devicesAllowed,
      adminsAllowed,
    },
    warnings,
  };
}
