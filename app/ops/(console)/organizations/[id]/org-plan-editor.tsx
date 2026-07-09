"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PlanSlug = "free" | "plus" | "pro";

export function OrgPlanEditor({
  orgId,
  plan,
  addonWhatsapp,
  addonDeviceQty,
  addonAdminQty,
  stripeLinked,
  canEdit,
}: {
  orgId: string;
  plan: string | null;
  addonWhatsapp: boolean;
  addonDeviceQty: number;
  addonAdminQty: number;
  stripeLinked: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const initialPlan = normalizePlan(plan);
  const [nextPlan, setNextPlan] = useState<PlanSlug>(initialPlan);
  const [whatsappAddon, setWhatsappAddon] = useState(addonWhatsapp);
  const [deviceQty, setDeviceQty] = useState(addonDeviceQty);
  const [adminQty, setAdminQty] = useState(addonAdminQty);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const dirty =
    nextPlan !== initialPlan ||
    whatsappAddon !== addonWhatsapp ||
    deviceQty !== addonDeviceQty ||
    adminQty !== addonAdminQty;

  async function save() {
    setPending(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch(`/api/ops/organizations/${orgId}/set-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: nextPlan,
          addonWhatsapp: nextPlan === "plus" ? whatsappAddon : undefined,
          addonDeviceQty: deviceQty,
          addonAdminQty: adminQty,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        warning?: string | null;
      };
      if (!res.ok) {
        setError(data.error || "Failed to update plan");
        return;
      }
      if (data.warning) setWarning(data.warning);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!canEdit) {
    return (
      <p className="text-xs text-zinc-500">
        Billing role required to change comped plan.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Comp plan (no payment)
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Sets the mirrored plan and add-ons for demos, trials, and operator comps. Does not
          charge Stripe.
        </p>
        {stripeLinked ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Stripe subscription linked — sync may overwrite until canceled in Stripe.
          </p>
        ) : null}
        {warning ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {warning}
          </p>
        ) : null}
      </div>

      <label className="block text-sm">
        <span className="text-zinc-500">Plan</span>
        <select
          value={nextPlan}
          onChange={(e) => setNextPlan(e.target.value as PlanSlug)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500 focus:ring-2"
        >
          <option value="free">Free</option>
          <option value="plus">Plus</option>
          <option value="pro">Pro</option>
        </select>
      </label>

      {nextPlan === "plus" ? (
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={whatsappAddon}
            onChange={(e) => setWhatsappAddon(e.target.checked)}
            className="rounded border-zinc-300 text-emerald-700 focus:ring-emerald-500"
          />
          WhatsApp add-on
        </label>
      ) : nextPlan === "pro" ? (
        <p className="text-xs text-zinc-500">Pro includes automated WhatsApp.</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-zinc-500">Extra devices</span>
          <input
            type="number"
            min={0}
            max={99}
            value={deviceQty}
            onChange={(e) => setDeviceQty(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-500">Extra admins</span>
          <input
            type="number"
            min={0}
            max={99}
            value={adminQty}
            onChange={(e) => setAdminQty(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
          />
        </label>
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      <button
        type="button"
        onClick={save}
        disabled={pending || !dirty}
        className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving…" : "Apply comp plan"}
      </button>
    </div>
  );
}

function normalizePlan(plan: string | null): PlanSlug {
  const p = plan?.toLowerCase();
  if (p === "plus" || p === "starter") return "plus";
  if (p === "pro") return "pro";
  return "free";
}
