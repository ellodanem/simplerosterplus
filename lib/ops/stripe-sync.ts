import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { PLAN_FREE } from "@/lib/plans";
import {
  getStripe,
  monthlyCentsFromSubscription,
  parseSubscriptionMirror,
} from "@/lib/ops/stripe";

// Mirror Stripe state onto Organization columns. The mirror exists only so the operator
// console can render lists/alerts without a Stripe round-trip per row; Stripe stays the
// source of truth. See docs/OPERATOR_CONSOLE.md §3.2.

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

function customerIdOf(sub: Stripe.Subscription): string {
  return typeof sub.customer === "string" ? sub.customer : sub.customer.id;
}

// Resolve which org a subscription belongs to: by mirrored stripeCustomerId first, then by
// the Stripe customer's `metadata.organizationId` (set when the customer is created).
async function resolveOrgId(sub: Stripe.Subscription): Promise<string | null> {
  const customerId = customerIdOf(sub);
  const byCustomer = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (byCustomer) return byCustomer.id;

  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if (customer && !("deleted" in customer && customer.deleted)) {
      const orgId = (customer as Stripe.Customer).metadata?.organizationId;
      if (orgId) {
        const exists = await prisma.organization.findUnique({
          where: { id: orgId },
          select: { id: true },
        });
        if (exists) return exists.id;
      }
    }
  } catch {
    // Customer fetch failed — fall through to unresolved.
  }
  return null;
}

export type SubApplyResult = { ok: boolean; organizationId?: string; reason?: string };

export async function applySubscriptionToOrg(sub: Stripe.Subscription): Promise<SubApplyResult> {
  const organizationId = await resolveOrgId(sub);
  if (!organizationId) {
    return { ok: false, reason: "no matching organization" };
  }

  const isCanceled =
    sub.status === "canceled" || sub.status === "incomplete_expired";
  const isActiveBilling = ACTIVE_STATUSES.has(sub.status);
  const parsed = parseSubscriptionMirror(sub);

  // Basil API (Stripe v22): current_period_end moved from the subscription to its items.
  const periodEndUnix = sub.items.data[0]?.current_period_end ?? null;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      stripeCustomerId: customerIdOf(sub),
      stripeSubscriptionId: isCanceled ? null : sub.id,
      plan: isCanceled ? PLAN_FREE : parsed.plan,
      subscriptionStatus: isCanceled ? null : sub.status,
      mrrCents: isActiveBilling ? monthlyCentsFromSubscription(sub) : 0,
      currentPeriodEnd: isCanceled ? null : periodEnd,
      trialEndsAt: trialEnd,
      addonDeviceQty: isCanceled ? 0 : parsed.addonDeviceQty,
      addonAdminQty: isCanceled ? 0 : parsed.addonAdminQty,
      addonWhatsapp: isCanceled ? false : parsed.addonWhatsapp,
    },
  });

  return { ok: true, organizationId };
}

// Manual operator "Sync from Stripe": pull the customer's current subscriptions and mirror
// the most relevant one. Used when a webhook was missed or for first-time linking.
export async function syncOrgFromStripe(
  orgId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { stripeCustomerId: true },
  });
  if (!org) return { ok: false, reason: "organization not found" };
  if (!org.stripeCustomerId) return { ok: false, reason: "no Stripe customer linked" };

  const subs = await getStripe().subscriptions.list({
    customer: org.stripeCustomerId,
    status: "all",
    limit: 20,
    expand: ["data.items.data.price.product"],
  });
  if (subs.data.length === 0) {
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        subscriptionStatus: null,
        stripeSubscriptionId: null,
        mrrCents: 0,
        plan: PLAN_FREE,
        addonDeviceQty: 0,
        addonAdminQty: 0,
        addonWhatsapp: false,
      },
    });
    return { ok: true };
  }

  const rank = (s: string) =>
    s === "active" ? 4 : s === "trialing" ? 3 : s === "past_due" ? 2 : 1;
  const chosen = [...subs.data].sort(
    (a, b) => rank(b.status) - rank(a.status) || b.created - a.created,
  )[0];

  const res = await applySubscriptionToOrg(chosen);
  return res.ok ? { ok: true } : { ok: false, reason: res.reason };
}
