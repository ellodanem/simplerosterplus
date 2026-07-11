import type { Prisma, PrismaClient } from "@prisma/client";
import { resolveBillingTier } from "@/lib/billing-access";
import {
  FREE_STAFF_MAX,
  PLUS_STAFF_MAX,
  PRO_STAFF_MAX,
  PLAN_PLUS,
  PLAN_PRO,
  type PlanLimitViolation,
} from "@/lib/plans";

type DbClient = PrismaClient | Prisma.TransactionClient;

/** Disposable names for setup explorers — replace anytime on Staff. */
export const SAMPLE_STAFF = [
  { firstName: "Alex", lastName: "Rivera" },
  { firstName: "Jordan", lastName: "Lee" },
  { firstName: "Sam", lastName: "Chen" },
  { firstName: "Taylor", lastName: "Brooks" },
  { firstName: "Morgan", lastName: "Patel" },
] as const;

export type SeedSampleStaffResult =
  | { created: number; skipped: true; reason: "already_has_staff" }
  | { created: number; skipped: false };

/**
 * Idempotent: only seeds when the org has zero staff.
 * Assigns existing roles round-robin onto the default location.
 */
export async function seedSampleStaff(
  organizationId: string,
  db: DbClient,
): Promise<SeedSampleStaffResult> {
  const existingCount = await db.staff.count({
    where: { organizationId, archivedAt: null },
  });
  if (existingCount > 0) {
    return { created: 0, skipped: true, reason: "already_has_staff" };
  }

  const location = await db.location.findFirst({
    where: { organizationId, isDefault: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  if (!location) {
    throw new SampleStaffSeedError("Add a default location before sample staff.", 400);
  }

  const roles = await db.staffRole.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  if (roles.length === 0) {
    throw new SampleStaffSeedError("Add at least one role before sample staff.", 400);
  }

  const limit = await staffCapacityViolation(organizationId, db, SAMPLE_STAFF.length);
  if (limit) {
    throw new SampleStaffSeedError(limit.message, 403, limit);
  }

  await db.staff.createMany({
    data: SAMPLE_STAFF.map((person, index) => {
      const role = roles[index % roles.length]!;
      return {
        organizationId,
        locationId: location.id,
        firstName: person.firstName,
        lastName: person.lastName,
        role: role.name,
        roleId: role.id,
        isActive: true,
        isTestUser: true,
        sortOrder: index,
      };
    }),
  });

  return { created: SAMPLE_STAFF.length, skipped: false };
}

export class SampleStaffSeedError extends Error {
  status: number;
  planLimit: PlanLimitViolation | null;

  constructor(message: string, status: number, planLimit: PlanLimitViolation | null = null) {
    super(message);
    this.name = "SampleStaffSeedError";
    this.status = status;
    this.planLimit = planLimit;
  }
}

async function staffCapacityViolation(
  organizationId: string,
  db: DbClient,
  addCount: number,
): Promise<PlanLimitViolation | null> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      plan: true,
      isDemo: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      suspendedAt: true,
    },
  });
  if (!org) return null;

  const tier = resolveBillingTier(org);
  const staffMax =
    tier === "free"
      ? FREE_STAFF_MAX
      : tier === "plus"
        ? PLUS_STAFF_MAX
        : tier === "pro"
          ? PRO_STAFF_MAX
          : null;
  if (staffMax == null) return null;

  const count = await db.staff.count({
    where: { organizationId, archivedAt: null },
  });
  if (count + addCount <= staffMax) return null;

  if (tier === "free") {
    return {
      kind: "staff",
      message: `Free plan includes up to ${FREE_STAFF_MAX} staff. Upgrade to Plus for up to ${PLUS_STAFF_MAX} staff.`,
      upgradeCta: "Upgrade to Plus",
      upgradePlan: PLAN_PLUS,
    };
  }
  if (tier === "plus") {
    return {
      kind: "staff",
      message: `Plus plan includes up to ${PLUS_STAFF_MAX} staff. Upgrade to Pro for up to ${PRO_STAFF_MAX} staff.`,
      upgradeCta: "Upgrade to Pro",
      upgradePlan: PLAN_PRO,
    };
  }
  return {
    kind: "staff",
    message: `Pro plan includes up to ${PRO_STAFF_MAX} staff. Contact support if you need a larger team.`,
    upgradeCta: "Contact support",
  };
}
