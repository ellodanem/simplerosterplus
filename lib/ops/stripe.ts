import Stripe from "stripe";

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

// Best-effort plan slug from a subscription's first price: lookup_key → product metadata
// `plan` → price nickname, lowercased. Falls back to "paid" so MRR still counts via mrrCents.
export function planSlugFromSubscription(sub: Stripe.Subscription): string {
  const price = sub.items.data[0]?.price;
  if (!price) return "paid";
  if (price.lookup_key) return price.lookup_key.toLowerCase();
  const product = price.product;
  if (product && typeof product !== "string" && !("deleted" in product)) {
    const metaPlan = product.metadata?.plan;
    if (metaPlan) return metaPlan.toLowerCase();
    if (product.name) return product.name.toLowerCase();
  }
  if (price.nickname) return price.nickname.toLowerCase();
  return "paid";
}
