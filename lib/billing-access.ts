import {
  PLAN_FREE,
  PLAN_PLUS,
  PLAN_PRO,
  isFreePlan,
} from "@/lib/plans";

export type OrgBillingSnapshot = {
  plan: string | null;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
  isDemo: boolean;
  suspendedAt: Date | null;
};

const PAID_ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Whether a mirrored Stripe subscription grants paid-tier limits. */
export function hasPaidSubscriptionAccess(org: OrgBillingSnapshot): boolean {
  if (!org.subscriptionStatus) return false;
  return PAID_ACCESS_STATUSES.has(org.subscriptionStatus);
}

/** Operator-comped or legacy orgs may have a paid plan slug without Stripe. */
export function isCompedPaidPlan(org: OrgBillingSnapshot): boolean {
  const plan = org.plan?.toLowerCase();
  if (!plan || isFreePlan(plan)) return false;
  return !org.stripeSubscriptionId;
}

export type BillingTier = "demo" | "free" | "plus" | "pro";

/** Effective tier for plan-limit enforcement. */
export function resolveBillingTier(org: OrgBillingSnapshot): BillingTier {
  if (org.isDemo) return "demo";
  const plan = org.plan?.toLowerCase() ?? PLAN_FREE;

  if (plan === PLAN_PRO) {
    if (hasPaidSubscriptionAccess(org) || isCompedPaidPlan(org)) return "pro";
  }
  if (plan === PLAN_PLUS || plan === "starter") {
    if (hasPaidSubscriptionAccess(org) || isCompedPaidPlan(org)) return "plus";
  }

  return "free";
}

export function subscriptionNeedsPaymentAttention(org: OrgBillingSnapshot): boolean {
  return org.subscriptionStatus === "past_due" || org.subscriptionStatus === "unpaid";
}

export function subscriptionIsCanceled(org: OrgBillingSnapshot): boolean {
  return (
    org.subscriptionStatus === "canceled" ||
    org.subscriptionStatus === "incomplete_expired"
  );
}

export function canManageBilling(org: OrgBillingSnapshot): boolean {
  return !org.isDemo && org.suspendedAt === null;
}
