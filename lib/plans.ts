/** Canonical plan slugs and limits — see docs/PRICING.md */

export const PLAN_FREE = "free" as const;
export const PLAN_PLUS = "plus" as const;
export const PLAN_PRO = "pro" as const;

export const FREE_STAFF_MAX = 10;
export const FREE_LOCATIONS_MAX = 2;
export const FREE_ADMINS_MAX = 1;
export const FREE_DEVICE_SLOTS = 1;
/** Auto Scheduler apply actions per calendar month on the free tier — see docs/PRICING.md */
export const FREE_AUTO_SCHEDULER_MONTHLY = 5;

export const PLUS_STAFF_MAX = 50;
export const PLUS_STAFF_WARN_40 = 40;
export const PLUS_STAFF_WARN_47 = 47;
export const PLUS_ADMINS_INCLUDED = 2;
export const PLUS_DEVICES_INCLUDED = 1;

export const PRO_STAFF_MAX = 100;
export const PRO_STAFF_WARN_80 = 80;
export const PRO_STAFF_WARN_95 = 95;
export const PRO_ADMINS_INCLUDED = 5;
export const PRO_DEVICES_INCLUDED = 3;

/** Automated WhatsApp utility messages per calendar month — see docs/PRICING.md */
export const PLUS_WHATSAPP_MONTHLY = 200;
export const PRO_WHATSAPP_MONTHLY = 500;
export const PLUS_WHATSAPP_WARN = 160;
export const PRO_WHATSAPP_WARN = 400;

export const DEVICE_TRIAL_DAYS = 30;
export const DEVICE_TRIAL_EXTENSION_DAYS = 30;
export const DEMO_SANDBOX_DAYS = 14;

/** Stripe price lookup_keys — see docs/PRICING.md § Stripe SKU sketch */
export const STRIPE_LOOKUP_PLUS_MONTHLY = "srp_plus";
export const STRIPE_LOOKUP_PLUS_ANNUAL = "srp_plus_annual";
export const STRIPE_LOOKUP_PRO_MONTHLY = "srp_pro";
export const STRIPE_LOOKUP_PRO_ANNUAL = "srp_pro_annual";
export const STRIPE_LOOKUP_DEVICE_ADDON = "srp_device_addon";
export const STRIPE_LOOKUP_ADMIN_ADDON = "srp_admin_addon";
export const STRIPE_LOOKUP_WHATSAPP_ADDON = "srp_whatsapp_addon";

export type PlanLimitKind = "staff" | "location" | "admin" | "device";

export type PlanLimitViolation = {
  kind: PlanLimitKind;
  message: string;
  upgradeCta: string;
  /** Target plan slug for checkout, when known */
  upgradePlan?: typeof PLAN_PLUS | typeof PLAN_PRO;
};

export type PlanLimitWarning = {
  kind: PlanLimitKind;
  message: string;
  severity: "info" | "warn";
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
