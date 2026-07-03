import Stripe from "stripe";
import {
  PLAN_FREE,
  PLAN_PLUS,
  PLAN_PRO,
  STRIPE_LOOKUP_ADMIN_ADDON,
  STRIPE_LOOKUP_DEVICE_ADDON,
  STRIPE_LOOKUP_PLUS_ANNUAL,
  STRIPE_LOOKUP_PLUS_MONTHLY,
  STRIPE_LOOKUP_PRO_ANNUAL,
  STRIPE_LOOKUP_PRO_MONTHLY,
  STRIPE_LOOKUP_WHATSAPP_ADDON,
} from "@/lib/plans";

// Single Stripe client for the operator/platform plane. Stripe is the source of truth for
// money; SR+ only mirrors a little state (see lib/ops/stripe-sync). All calls are
// server-side. See docs/OPERATOR_CONSOLE.md §3.2.

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!client) {
    // apiVersion intentionally omitted → use the SDK's pinned default for this major.
    client = new Stripe(key);
  }
  return client;
}

// Deep links into the Stripe dashboard (test vs live inferred from the key prefix).
export function stripeDashboardBase(): string {
  const test = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test");
  return test ? "https://dashboard.stripe.com/test" : "https://dashboard.stripe.com";
}

export function stripeCustomerUrl(customerId: string): string {
  return `${stripeDashboardBase()}/customers/${customerId}`;
}

// Normalize a Stripe lookup_key / product metadata slug to our plan column values.
export function normalizePlanSlug(raw: string | null | undefined): string {
  if (!raw) return PLAN_FREE;
  const key = raw.toLowerCase();
  if (key === PLAN_PRO || key.includes("srp_pro") || key === "pro") return PLAN_PRO;
  if (key === PLAN_PLUS || key.includes("srp_plus") || key === "plus" || key === "starter") {
    return PLAN_PLUS;
  }
  if (key === PLAN_FREE || key === "trial") return PLAN_FREE;
  return key;
}

const BASE_PLAN_LOOKUPS = new Set([
  STRIPE_LOOKUP_PLUS_MONTHLY,
  STRIPE_LOOKUP_PLUS_ANNUAL,
  STRIPE_LOOKUP_PRO_MONTHLY,
  STRIPE_LOOKUP_PRO_ANNUAL,
]);

export type ParsedSubscriptionMirror = {
  plan: string;
  addonDeviceQty: number;
  addonAdminQty: number;
  addonWhatsapp: boolean;
};

/** Parse plan slug and add-on quantities from subscription line items. */
export function parseSubscriptionMirror(sub: Stripe.Subscription): ParsedSubscriptionMirror {
  let plan: string = PLAN_FREE;
  let addonDeviceQty = 0;
  let addonAdminQty = 0;
  let addonWhatsapp = false;

  for (const item of sub.items.data) {
    const lk = item.price.lookup_key?.toLowerCase() ?? "";
    const qty = item.quantity ?? 1;

    if (lk === STRIPE_LOOKUP_PRO_MONTHLY || lk === STRIPE_LOOKUP_PRO_ANNUAL || lk.includes("pro")) {
      plan = PLAN_PRO;
    } else if (
      (lk === STRIPE_LOOKUP_PLUS_MONTHLY ||
        lk === STRIPE_LOOKUP_PLUS_ANNUAL ||
        lk.includes("plus")) &&
      plan !== PLAN_PRO
    ) {
      plan = PLAN_PLUS;
    } else if (BASE_PLAN_LOOKUPS.has(lk)) {
      plan = normalizePlanSlug(lk);
    }

    if (lk === STRIPE_LOOKUP_DEVICE_ADDON) addonDeviceQty += qty;
    if (lk === STRIPE_LOOKUP_ADMIN_ADDON) addonAdminQty += qty;
    if (lk === STRIPE_LOOKUP_WHATSAPP_ADDON) addonWhatsapp = true;
  }

  if (plan === PLAN_FREE && sub.items.data.length > 0) {
    const fallback = sub.items.data[0]?.price.lookup_key ?? sub.items.data[0]?.price.nickname;
    plan = normalizePlanSlug(fallback);
  }

  return { plan, addonDeviceQty, addonAdminQty, addonWhatsapp };
}

// Normalize a subscription's recurring amount to MONTHLY cents (yearly → /12), summing
// all items × quantity. Used to mirror an exact MRR figure.
export function monthlyCentsFromSubscription(sub: Stripe.Subscription): number {
  let monthly = 0;
  for (const item of sub.items.data) {
    const price = item.price;
    const unit = price.unit_amount ?? 0;
    const qty = item.quantity ?? 1;
    const interval = price.recurring?.interval;
    const intervalCount = price.recurring?.interval_count ?? 1;
    let perMonth = unit * qty;
    if (interval === "year") perMonth = perMonth / (12 * intervalCount);
    else if (interval === "week") perMonth = (perMonth * 52) / (12 * intervalCount);
    else if (interval === "day") perMonth = (perMonth * 365) / (12 * intervalCount);
    else if (interval === "month") perMonth = perMonth / intervalCount;
    monthly += perMonth;
  }
  return Math.round(monthly);
}

/** @deprecated Prefer parseSubscriptionMirror for plan slug */
export function planSlugFromSubscription(sub: Stripe.Subscription): string {
  return parseSubscriptionMirror(sub).plan;
}

/** Resolve a Stripe price id by lookup_key (active prices only). */
export async function getPriceIdByLookupKey(lookupKey: string): Promise<string> {
  const prices = await getStripe().prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    throw new Error(
      `Stripe price not found for lookup_key "${lookupKey}". Run npm run stripe:seed-products.`,
    );
  }
  return price.id;
}
