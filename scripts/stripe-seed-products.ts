/**
 * Create Stripe products and prices with lookup_keys from docs/PRICING.md.
 * Idempotent: skips prices that already exist for each lookup_key.
 *
 * Usage: npx tsx scripts/stripe-seed-products.ts
 * Requires STRIPE_SECRET_KEY in .env / .env.local
 */
import { config } from "dotenv";
import {
  STRIPE_LOOKUP_ADMIN_ADDON,
  STRIPE_LOOKUP_DEVICE_ADDON,
  STRIPE_LOOKUP_PLUS_ANNUAL,
  STRIPE_LOOKUP_PLUS_MONTHLY,
  STRIPE_LOOKUP_PRO_ANNUAL,
  STRIPE_LOOKUP_PRO_MONTHLY,
  STRIPE_LOOKUP_WHATSAPP_ADDON,
} from "../lib/plans";
import { getStripe, stripeConfigured } from "../lib/ops/stripe";

config({ path: ".env" });
config({ path: ".env.local", override: true });

type PriceSpec = {
  lookupKey: string;
  productName: string;
  unitAmountCents: number;
  interval: "month" | "year";
  metadata?: Record<string, string>;
};

const PRICES: PriceSpec[] = [
  {
    lookupKey: STRIPE_LOOKUP_PLUS_MONTHLY,
    productName: "Simple Roster Plus — Plus",
    unitAmountCents: 1999,
    interval: "month",
    metadata: { plan: "plus" },
  },
  {
    lookupKey: STRIPE_LOOKUP_PLUS_ANNUAL,
    productName: "Simple Roster Plus — Plus (annual)",
    unitAmountCents: 19900,
    interval: "year",
    metadata: { plan: "plus" },
  },
  {
    lookupKey: STRIPE_LOOKUP_PRO_MONTHLY,
    productName: "Simple Roster Plus — Pro",
    unitAmountCents: 4999,
    interval: "month",
    metadata: { plan: "pro" },
  },
  {
    lookupKey: STRIPE_LOOKUP_PRO_ANNUAL,
    productName: "Simple Roster Plus — Pro (annual)",
    unitAmountCents: 49900,
    interval: "year",
    metadata: { plan: "pro" },
  },
  {
    lookupKey: STRIPE_LOOKUP_DEVICE_ADDON,
    productName: "Simple Roster Plus — Extra device",
    unitAmountCents: 500,
    interval: "month",
    metadata: { addon: "device" },
  },
  {
    lookupKey: STRIPE_LOOKUP_ADMIN_ADDON,
    productName: "Simple Roster Plus — Extra admin",
    unitAmountCents: 200,
    interval: "month",
    metadata: { addon: "admin" },
  },
  {
    lookupKey: STRIPE_LOOKUP_WHATSAPP_ADDON,
    productName: "Simple Roster Plus — WhatsApp publish",
    unitAmountCents: 500,
    interval: "month",
    metadata: { addon: "whatsapp" },
  },
];

async function ensurePrice(spec: PriceSpec): Promise<void> {
  const stripe = getStripe();
  const existing = await stripe.prices.list({
    lookup_keys: [spec.lookupKey],
    active: true,
    limit: 1,
  });
  if (existing.data[0]) {
    console.log(`OK  ${spec.lookupKey} → ${existing.data[0].id} (exists)`);
    return;
  }

  const product = await stripe.products.create({
    name: spec.productName,
    metadata: spec.metadata,
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: spec.unitAmountCents,
    recurring: { interval: spec.interval },
    lookup_key: spec.lookupKey,
    transfer_lookup_key: true,
    metadata: spec.metadata,
  });

  console.log(`NEW ${spec.lookupKey} → ${price.id}`);
}

async function main() {
  if (!stripeConfigured()) {
    console.error("STRIPE_SECRET_KEY is not set.");
    process.exit(1);
  }

  console.log("\nSeeding Stripe products/prices (docs/PRICING.md)…\n");
  for (const spec of PRICES) {
    await ensurePrice(spec);
  }
  console.log("\nDone. Point Stripe webhooks at /api/stripe/webhook on your app URL.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
