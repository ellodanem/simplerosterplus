import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/app/components/app-nav";
import { BrandLogo } from "@/app/components/brand-logo";
import { BillingStatusBanner, PlanLimitBanner } from "@/app/components/plan-limit-banner";
import { DemoSandboxBanner } from "@/app/components/demo-sandbox-banner";
import { FeedbackButton } from "@/app/components/feedback-button";
import { ImpersonationBanner } from "@/app/components/impersonation-banner";
import { LogoutButton } from "@/app/components/logout-button";
import { OnboardingSessionLinker } from "@/app/components/onboarding-signup-beacon";
import { clerkConfigured, tenantSignInPath } from "@/lib/clerk/config";
import { subscriptionNeedsPaymentAttention } from "@/lib/billing-access";
import { getPlanUsage } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { getSession, isOnboardingSimulateSession, isReadOnlySession } from "@/lib/session";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) {
    redirect(clerkConfigured() ? tenantSignInPath() : "/login");
  }

  const readOnly = isReadOnlySession(session);
  const onboardingSimulate = isOnboardingSimulateSession(session);
  const operatorSession = readOnly || onboardingSimulate;

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: {
      isDemo: true,
      demoExpiresAt: true,
      subscriptionStatus: true,
      plan: true,
      stripeSubscriptionId: true,
      suspendedAt: true,
    },
  });

  const planUsage = org && !org.isDemo ? await getPlanUsage(session.orgId) : null;
  const paymentAttention = org
    ? subscriptionNeedsPaymentAttention({
        plan: org.plan,
        subscriptionStatus: org.subscriptionStatus,
        stripeSubscriptionId: org.stripeSubscriptionId,
        isDemo: org.isDemo,
        suspendedAt: org.suspendedAt,
      })
    : false;

  return (
    <div className="flex min-h-full flex-col">
      <OnboardingSessionLinker />
      {operatorSession ? (
        <ImpersonationBanner
          orgName={session.orgName ?? "Organization"}
          asEmail={session.email}
          mode={onboardingSimulate ? "onboarding" : "readonly"}
        />
      ) : null}
      {org?.isDemo && org.demoExpiresAt ? (
        <DemoSandboxBanner demoExpiresAt={org.demoExpiresAt} />
      ) : null}
      {!operatorSession && paymentAttention ? (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4">
          <BillingStatusBanner needsPaymentAttention />
        </div>
      ) : null}
      {!operatorSession && planUsage && planUsage.warnings.length > 0 ? (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4">
          <PlanLimitBanner warnings={planUsage.warnings} />
        </div>
      ) : null}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              href="/"
              className="shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              aria-label="Simple Roster Plus, home"
            >
              <BrandLogo height={28} priority />
            </Link>
            <AppNav />
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <span className="truncate max-w-[200px]" title={session.email}>
              {session.email}
            </span>
            <LogoutButton readOnly={operatorSession} />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</div>
      <footer className="mt-auto border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-4 px-4 py-3 text-xs text-zinc-500">
          <FeedbackButton userEmail={session.email} />
        </div>
      </footer>
    </div>
  );
}
