import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canManageBilling,
  hasPaidSubscriptionAccess,
  isCompedPaidPlan,
  resolveBillingTier,
  subscriptionNeedsPaymentAttention,
} from "@/lib/billing-access";
import { getPlanUsage } from "@/lib/plan-limits";
import { planLabel } from "@/lib/plans";
import { getSession } from "@/lib/session";
import { stripeConfigured } from "@/lib/ops/stripe";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: {
      plan: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      stripeCustomerId: true,
      currentPeriodEnd: true,
      mrrCents: true,
      isDemo: true,
      suspendedAt: true,
      addonDeviceQty: true,
      addonAdminQty: true,
      addonWhatsapp: true,
    },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const usage = await getPlanUsage(session.orgId);
  const tier = resolveBillingTier(org);
  const billingSnapshot = {
    plan: org.plan,
    planLabel: planLabel(org.plan),
    tier,
    subscriptionStatus: org.subscriptionStatus,
    currentPeriodEnd: org.currentPeriodEnd?.toISOString() ?? null,
    mrrCents: org.mrrCents,
    hasPaidAccess: hasPaidSubscriptionAccess(org) || isCompedPaidPlan(org),
    needsPaymentAttention: subscriptionNeedsPaymentAttention(org),
    canManageBilling: canManageBilling(org),
    stripeConfigured: stripeConfigured(),
    hasStripeCustomer: !!org.stripeCustomerId,
    addons: {
      devices: org.addonDeviceQty,
      admins: org.addonAdminQty,
      whatsapp: org.addonWhatsapp,
    },
    usage,
  };

  return NextResponse.json(billingSnapshot);
}
