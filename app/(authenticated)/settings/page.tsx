import { redirectToSignIn } from "@/lib/auth-redirect";
import {
  canManageBilling,
  hasPaidSubscriptionAccess,
  isCompedPaidPlan,
  resolveBillingTier,
  subscriptionNeedsPaymentAttention,
} from "@/lib/billing-access";
import { formatUsd, planLabel, planMonthlyUsd, subscriptionStatusLabel } from "@/lib/ops/billing";
import { MessagingSettings } from "@/app/components/messaging-settings";
import { getWhatsappAccess } from "@/lib/messaging/whatsapp-access";
import { twilioWhatsappConfigured } from "@/lib/messaging/twilio-whatsapp";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { stripeConfigured } from "@/lib/ops/stripe";
import { BillingActions } from "@/app/components/billing-actions";
import { redirectToSetupIfIncomplete } from "@/lib/setup-guard";
import { getPlanUsage } from "@/lib/plan-limits";

export const metadata = {
  title: "Settings | Simple Roster Plus",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function UsageMeter({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number | null;
}) {
  const cap = max ?? used;
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-zinc-600">{label}</span>
        <span className="font-medium text-zinc-900">
          {used}
          {max !== null ? ` / ${max}` : " (unlimited)"}
        </span>
      </div>
      {max !== null ? (
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${pct >= 95 ? "bg-amber-500" : "bg-emerald-600"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await getSession();
  if (!session) redirectToSignIn();

  await redirectToSetupIfIncomplete({ organizationId: session.orgId, nextPath: "/settings" });

  const params = await searchParams;
  const checkoutFlash =
    params.checkout === "success"
      ? "Thanks — your subscription will appear here once Stripe confirms payment."
      : params.checkout === "canceled"
        ? "Checkout canceled. No charges were made."
        : null;

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
      messagingWhatsappEnabled: true,
      whatsappSentMonth: true,
      whatsappSentCount: true,
    },
  });
  if (!org) return null;

  const whatsappAccess = getWhatsappAccess(org);

  const usage = await getPlanUsage(session.orgId);
  const tier = resolveBillingTier(org);
  const paid = hasPaidSubscriptionAccess(org) || isCompedPaidPlan(org);
  const monthly =
    org.mrrCents != null && org.mrrCents > 0
      ? org.mrrCents / 100
      : paid
        ? planMonthlyUsd(org.plan)
        : 0;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Plan, usage, and billing for your organization.
      </p>

      {checkoutFlash ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          {checkoutFlash}
        </p>
      ) : null}

      {subscriptionNeedsPaymentAttention(org) ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          Your last payment failed. Update your payment method to avoid losing paid features.
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Current plan</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Plan</dt>
            <dd className="font-medium text-zinc-900">{planLabel(org.plan)}</dd>
          </div>
          {org.subscriptionStatus ? (
            <div className="flex justify-between">
              <dt className="text-zinc-500">Subscription</dt>
              <dd className="font-medium text-zinc-900">
                {subscriptionStatusLabel(org.subscriptionStatus)}
              </dd>
            </div>
          ) : null}
          {paid && monthly > 0 ? (
            <div className="flex justify-between">
              <dt className="text-zinc-500">Monthly</dt>
              <dd className="font-medium text-zinc-900">{formatUsd(monthly)}</dd>
            </div>
          ) : null}
          {org.currentPeriodEnd ? (
            <div className="flex justify-between">
              <dt className="text-zinc-500">Renews</dt>
              <dd className="font-medium text-zinc-900">
                {formatDate(org.currentPeriodEnd.toISOString())}
              </dd>
            </div>
          ) : null}
          {(org.addonDeviceQty > 0 || org.addonAdminQty > 0 || org.addonWhatsapp) && (
            <div className="flex justify-between">
              <dt className="text-zinc-500">Add-ons</dt>
              <dd className="text-right font-medium text-zinc-900">
                {[
                  org.addonDeviceQty > 0 ? `${org.addonDeviceQty} extra device(s)` : null,
                  org.addonAdminQty > 0 ? `${org.addonAdminQty} extra admin(s)` : null,
                  org.addonWhatsapp ? "WhatsApp" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-6 border-t border-zinc-100 pt-6">
          <BillingActions
            tier={tier}
            hasStripeCustomer={!!org.stripeCustomerId}
            stripeConfigured={stripeConfigured()}
            canManageBilling={canManageBilling(org)}
          />
        </div>
      </section>

      {usage && usage.tier !== "demo" ? (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Usage</h2>
          <div className="mt-4 space-y-4">
            <UsageMeter label="Staff" used={usage.staff} max={usage.limits.staffMax} />
            <UsageMeter label="Locations" used={usage.locations} max={usage.limits.locationMax} />
            <UsageMeter
              label="Admin logins"
              used={usage.admins}
              max={usage.limits.adminsAllowed}
            />
            <UsageMeter
              label="Devices"
              used={usage.devices}
              max={usage.limits.devicesAllowed}
            />
            {whatsappAccess.entitled ? (
              <UsageMeter
                label="WhatsApp alerts (this month)"
                used={whatsappAccess.sentThisMonth}
                max={whatsappAccess.monthlyCap}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">WhatsApp alerts</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Automated WhatsApp link when you publish a week. Staff can download an image from the
          share page. Manual link sharing is always available from the roster.
        </p>
        <MessagingSettings
          initial={{
            ...whatsappAccess,
            messagingWhatsappEnabled: org.messagingWhatsappEnabled,
            configured: twilioWhatsappConfigured(),
            hasTemplate: Boolean(process.env.TWILIO_WHATSAPP_ROSTER_CONTENT_SID?.trim()),
          }}
        />
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
        <h2 className="font-semibold text-zinc-900">Plan summary</h2>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Free — up to 10 staff, 2 locations, 30-day device sync trial</li>
          <li>Plus — $19.99/mo, up to 50 staff, unlimited locations, SMS roster publish</li>
          <li>Pro — $49.99/mo, up to 100 staff, WhatsApp included, 3 devices</li>
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          Extra devices (+$5/mo) and admins (+$2/mo) are available in the billing portal after
          subscribing.
        </p>
      </section>
    </div>
  );
}
