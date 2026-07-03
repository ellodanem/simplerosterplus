"use client";

import { useState } from "react";
import { PLAN_PLUS, PLAN_PRO } from "@/lib/plans";

type BillingActionsProps = {
  tier: string;
  hasStripeCustomer: boolean;
  stripeConfigured: boolean;
  canManageBilling: boolean;
};

export function BillingActions({
  tier,
  hasStripeCustomer,
  stripeConfigured,
  canManageBilling,
}: BillingActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: typeof PLAN_PLUS | typeof PLAN_PRO, interval: "month" | "year") {
    setLoading(`${plan}-${interval}`);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not start checkout");
        return;
      }
      if (body.url) window.location.href = body.url;
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not open billing portal");
        return;
      }
      if (body.url) window.location.href = body.url;
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(null);
    }
  }

  if (!canManageBilling) {
    return (
      <p className="text-sm text-zinc-500">Billing is not available for demo sandboxes.</p>
    );
  }

  if (!stripeConfigured) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Online billing is being set up. Contact support to upgrade in the meantime.
      </p>
    );
  }

  const isPaid = tier === "plus" || tier === "pro";

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {isPaid && hasStripeCustomer ? (
        <button
          type="button"
          onClick={() => void openPortal()}
          disabled={loading !== null}
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading === "portal" ? "Opening…" : "Manage subscription"}
        </button>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void startCheckout(PLAN_PLUS, "month")}
            disabled={loading !== null}
            className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading === "plus-month" ? "Redirecting…" : "Upgrade to Plus — $19.99/mo"}
          </button>
          <button
            type="button"
            onClick={() => void startCheckout(PLAN_PRO, "month")}
            disabled={loading !== null}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
          >
            {loading === "pro-month" ? "Redirecting…" : "Go Pro — $49.99/mo"}
          </button>
        </div>
      )}

      {!isPaid ? (
        <p className="text-xs text-zinc-500">
          Annual plans ($199/yr Plus, $499/yr Pro) are available after checkout via Manage
          subscription.
        </p>
      ) : null}
    </div>
  );
}
