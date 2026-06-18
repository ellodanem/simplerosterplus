/** Canonical plan slugs and limits — see docs/PRICING.md */

export const PLAN_FREE = "free" as const;
export const PLAN_PLUS = "plus" as const;
export const PLAN_PRO = "pro" as const;

export const FREE_STAFF_MAX = 10;
export const FREE_LOCATIONS_MAX = 2;
export const FREE_ADMINS_MAX = 1;
export const FREE_DEVICE_SLOTS = 1;

export const DEVICE_TRIAL_DAYS = 30;
export const DEVICE_TRIAL_EXTENSION_DAYS = 30;
export const DEMO_SANDBOX_DAYS = 14;

export type PlanLimitKind = "staff" | "location" | "admin" | "device";

export type PlanLimitViolation = {
  kind: PlanLimitKind;
  message: string;
  upgradeCta: string;
};

export function isFreePlan(plan: string | null | undefined): boolean {
  return plan === PLAN_FREE;
}

export function planLabel(plan: string | null | undefined): string {
  if (!plan) return "No plan";
  switch (plan) {
    case PLAN_FREE:
      return "Free";
    case PLAN_PLUS:
    case "starter":
      return "Plus";
    case PLAN_PRO:
      return "Pro";
    case "trial":
      return "Trial";
    default:
      return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
}
