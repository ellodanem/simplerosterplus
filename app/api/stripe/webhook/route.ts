import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/ops/stripe";
import { applySubscriptionToOrg } from "@/lib/ops/stripe-sync";

// Stripe → SR+ mirror webhook. NOT operator-gated (it lives outside /api/ops): Stripe
// authenticates via the signature, verified with STRIPE_WEBHOOK_SIGNING_SECRET. Point the
// Stripe dashboard endpoint at /api/stripe/webhook on the app domain.
// See docs/OPERATOR_CONSOLE.md §3.2.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function applyBySubscriptionId(subId: string) {
  const sub = await getStripe().subscriptions.retrieve(subId);
  await applySubscriptionToOrg(sub);
}

// Basil API (Stripe v22): an invoice's subscription lives under `parent.subscription_details`.
function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | undefined {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object") return sub.id;
  return undefined;
}

export async function POST(request: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SIGNING_SECRET) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SIGNING_SECRET,
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applySubscriptionToOrg(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = subscriptionIdFromInvoice(invoice);
        if (subId) await applyBySubscriptionId(subId);
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Link the org → customer up front when checkout carried the org id, so subsequent
        // subscription events resolve by stripeCustomerId.
        const orgId = session.client_reference_id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (orgId && customerId) {
          await prisma.organization
            .update({ where: { id: orgId }, data: { stripeCustomerId: customerId } })
            .catch(() => undefined);
        }
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subId) await applyBySubscriptionId(subId);
        break;
      }
      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (err) {
    // Log and 200 so Stripe doesn't hammer retries on a transient mirror failure; the
    // manual "Sync from Stripe" action can reconcile.
    console.error("stripe webhook handler error", { type: event.type, err });
  }

  return NextResponse.json({ received: true });
}
