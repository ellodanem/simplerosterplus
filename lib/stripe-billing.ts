import { prisma } from "@/lib/prisma";
import {
  PLAN_PLUS,
  PLAN_PRO,
  PRO_STAFF_MAX,
  STRIPE_LOOKUP_PLUS_ANNUAL,
  STRIPE_LOOKUP_PLUS_MONTHLY,
  STRIPE_LOOKUP_PRO_ANNUAL,
  STRIPE_LOOKUP_PRO_MONTHLY,
} from "@/lib/plans";
import { canManageBilling } from "@/lib/billing-access";
import { getPriceIdByLookupKey, getStripe, stripeConfigured } from "@/lib/ops/stripe";

export type CheckoutPlan = typeof PLAN_PLUS | typeof PLAN_PRO;
export type CheckoutInterval = "month" | "year";

function lookupKeyForPlan(plan: CheckoutPlan, interval: CheckoutInterval): string {
  if (plan === PLAN_PRO) {
    return interval === "year" ? STRIPE_LOOKUP_PRO_ANNUAL : STRIPE_LOOKUP_PRO_MONTHLY;
  }
  return interval === "year" ? STRIPE_LOOKUP_PLUS_ANNUAL : STRIPE_LOOKUP_PLUS_MONTHLY;
}

function appBaseUrl(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  return `${proto}://${host}`;
}

/** Ensure a Stripe customer exists for the org; returns customer id. */
export async function ensureStripeCustomer(
  organizationId: string,
  email: string,
): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeCustomerId: true, name: true },
  });
  if (!org) throw new Error("Organization not found");
  if (org.stripeCustomerId) return org.stripeCustomerId;

  const customer = await getStripe().customers.create({
    email,
    name: org.name,
    metadata: { organizationId },
  });
  await prisma.organization.update({
    where: { id: organizationId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export async function createCheckoutSession(args: {
  organizationId: string;
  email: string;
  plan: CheckoutPlan;
  interval: CheckoutInterval;
  request: Request;
}): Promise<{ url: string }> {
  if (!stripeConfigured()) {
    throw new Error("Stripe is not configured");
  }

  const org = await prisma.organization.findUnique({
    where: { id: args.organizationId },
    select: {
      isDemo: true,
      suspendedAt: true,
      plan: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
    },
  });
  if (!org || !canManageBilling(org)) {
    throw new Error("Billing is not available for this organization");
  }

  if (args.plan === PLAN_PRO) {
    const staffCount = await prisma.staff.count({
      where: { organizationId: args.organizationId, archivedAt: null },
    });
    if (staffCount > PRO_STAFF_MAX) {
      throw new Error(
        `Pro supports up to ${PRO_STAFF_MAX} staff. Archive staff or stay on Plus before upgrading.`,
      );
    }
  }

  const customerId = await ensureStripeCustomer(args.organizationId, args.email);
  const priceId = await getPriceIdByLookupKey(lookupKeyForPlan(args.plan, args.interval));
  const base = appBaseUrl(args.request);

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: args.organizationId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/settings?checkout=success`,
    cancel_url: `${base}/settings?checkout=canceled`,
    subscription_data: {
      metadata: { organizationId: args.organizationId },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
}

export async function createBillingPortalSession(args: {
  organizationId: string;
  request: Request;
}): Promise<{ url: string }> {
  if (!stripeConfigured()) {
    throw new Error("Stripe is not configured");
  }

  const org = await prisma.organization.findUnique({
    where: { id: args.organizationId },
    select: {
      stripeCustomerId: true,
      isDemo: true,
      suspendedAt: true,
      plan: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
    },
  });
  if (!org?.stripeCustomerId || !canManageBilling(org)) {
    throw new Error("No billing account linked");
  }

  const base = appBaseUrl(args.request);
  const session = await getStripe().billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${base}/settings`,
  });

  return { url: session.url };
}
