// Billing display helpers for the operator console.
//
// IMPORTANT: Stripe is the source of truth for money. Until the Stripe integration lands
// (see docs/OPERATOR_CONSOLE.md §3.2), the console renders from the MIRRORED columns on
// `Organization` (plan, subscriptionStatus, currentPeriodEnd, trialEndsAt). The plan→price
// map below is a PLACEHOLDER for display/estimation only; real amounts come from Stripe
// invoices once wired. Canonical tiers: docs/PRICING.md (Free / Plus / Pro).

import { planLabel as canonicalPlanLabel } from "@/lib/plans";

export type PlanSlug = "free" | "trial" | "starter" | "plus" | "pro";

// Placeholder monthly USD by plan slug (Stripe mirror is authoritative).
const PLAN_MONTHLY_USD: Record<string, number> = {
  free: 0,
  trial: 0,
  starter: 19.99,
  plus: 19.99,
  pro: 49.99,
};

export function planMonthlyUsd(plan: string | null | undefined): number {
  if (!plan) return 0;
  return PLAN_MONTHLY_USD[plan] ?? 0;
}

// Exact monthly USD for an org: prefer the Stripe-mirrored `mrrCents`, fall back to the
// plan→price estimate only when no mirror exists yet.
export function orgMonthlyUsd(o: { plan?: string | null; mrrCents?: number | null }): number {
  if (o.mrrCents != null) return o.mrrCents / 100;
  return planMonthlyUsd(o.plan ?? null);
}

export function planLabel(plan: string | null | undefined): string {
  return canonicalPlanLabel(plan);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Maps a (possibly null) mirrored subscription status to a console pill tone.
export type StatusTone = "ok" | "warn" | "danger" | "neutral";

export function subscriptionStatusTone(status: string | null | undefined): StatusTone {
  switch (status) {
    case "active":
      return "ok";
    case "trialing":
      return "warn";
    case "past_due":
    case "unpaid":
      return "danger";
    case "canceled":
    case "incomplete_expired":
      return "neutral";
    default:
      return "neutral";
  }
}

export function subscriptionStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
