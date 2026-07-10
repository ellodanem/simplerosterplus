import {
  PLAN_FREE,
  PLAN_PLUS,
  PLAN_PRO,
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
export function isCompedPaidPlan(
  org: Pick<OrgBillingSnapshot, "plan" | "stripeSubscriptionId">,
): boolean {
  const plan = org.plan?.toLowerCase();
  if (plan !== PLAN_PLUS && plan !== "starter" && plan !== PLAN_PRO) return false;
  return !org.stripeSubscriptionId;
}

export type BillingTier = "demo" | "free" | "plus" | "pro";

/** Effective tier for plan-limit enforcement. */
export function resolveBillingTier(org: OrgBillingSnapshot): BillingTier {
  const plan = org.plan?.toLowerCase() ?? PLAN_FREE;

  // Demo sandboxes honor an operator-comped plan slug; unset plan keeps legacy unlimited demo.
  if (org.isDemo) {
    if (plan === PLAN_PRO) return "pro";
    if (plan === PLAN_PLUS || plan === "starter") return "plus";
    return "demo";
  }

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
