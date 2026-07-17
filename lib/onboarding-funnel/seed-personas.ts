import type { PrismaClient } from "@prisma/client";
import { milestoneIdempotencyKey } from "./idempotency";
import type { OnboardingStage } from "./stages";

/**
 * Dev-only funnel personas for Ops Dashboard work. Skipped in production via seed guard.
 * Emails use @funnel-seed.local so they are easy to identify and exclude later.
 */
export async function seedOnboardingFunnelPersonas(prisma: PrismaClient): Promise<void> {
  const personas: Array<{
    key: string;
    email: string;
    name: string;
    business: string;
    stage: OnboardingStage;
    extras?: {
      activatedAt?: boolean;
      completedAt?: boolean;
      abandonedAt?: boolean;
      abandonmentReason?: string;
      needsSupport?: boolean;
      doNotContact?: boolean;
      followUpStatus?: string;
      followUpFailed?: boolean;
      resumedAfterFollowUp?: boolean;
    };
  }> = [
    {
      key: "signup_only",
      email: "signup-only@funnel-seed.local",
      name: "Sam Signup",
      business: "Funnel Seed — Signup Only",
      stage: "signup_started",
      extras: { abandonedAt: true, abandonmentReason: "signup_no_account" },
    },
    {
      key: "account_no_ws",
      email: "account-no-ws@funnel-seed.local",
      name: "Alex Account",
      business: "Funnel Seed — No Workspace",
      stage: "account_created",
    },
    {
      key: "ws_no_staff",
      email: "ws-no-staff@funnel-seed.local",
      name: "Wendy Workspace",
      business: "Funnel Seed — No Staff",
      stage: "workspace_created",
    },
    {
      key: "staff_no_roster",
      email: "staff-no-roster@funnel-seed.local",
      name: "Eve Employee",
      business: "Funnel Seed — No Roster",
      stage: "employees_added",
    },
    {
      key: "roster_unpublished",
      email: "roster-draft@funnel-seed.local",
      name: "Riley Roster",
      business: "Funnel Seed — Draft Roster",
      stage: "first_roster_created",
    },
    {
      key: "activated",
      email: "activated@funnel-seed.local",
      name: "Pat Published",
      business: "Funnel Seed — Activated",
      stage: "first_roster_published",
      extras: { activatedAt: true, completedAt: true },
    },
    {
      key: "needs_support",
      email: "needs-support@funnel-seed.local",
      name: "Nora Error",
      business: "Funnel Seed — Needs Support",
      stage: "employees_added",
      extras: { needsSupport: true },
    },
    {
      key: "dnc",
      email: "dnc@funnel-seed.local",
      name: "Dana NoContact",
      business: "Funnel Seed — DNC",
      stage: "workspace_created",
      extras: { doNotContact: true },
    },
    {
      key: "followup_failed",
      email: "followup-failed@funnel-seed.local",
      name: "Fran Failed",
      business: "Funnel Seed — Follow-up Failed",
      stage: "employees_added",
      extras: { followUpFailed: true, followUpStatus: "failed" },
    },
    {
      key: "resumed",
      email: "resumed@funnel-seed.local",
      name: "Remy Resumed",
      business: "Funnel Seed — Resumed",
      stage: "first_roster_started",
      extras: { resumedAfterFollowUp: true, followUpStatus: "sent" },
    },
  ];

  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

  for (const p of personas) {
    let org = await prisma.organization.findFirst({
      where: { name: p.business },
    });
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: p.business,
          timeZone: "UTC",
          plan: "free",
        },
      });
      await prisma.location.create({
        data: {
          organizationId: org.id,
          name: "Main",
          isDefault: true,
          sortOrder: 0,
        },
      });
    }

    const user = await prisma.appUser.upsert({
      where: {
        organizationId_email: { organizationId: org.id, email: p.email },
      },
      create: {
        organizationId: org.id,
        email: p.email,
        role: "owner",
        passwordHash: null,
      },
      update: {},
      select: { id: true },
    });

    const at = hoursAgo(p.extras?.abandonedAt ? 80 : 30);
    const stagesToEmit: OnboardingStage[] = [];
    const order: OnboardingStage[] = [
      "signup_started",
      "account_created",
      "workspace_created",
      "business_details_completed",
      "employees_added",
      "first_roster_started",
      "first_roster_created",
      "first_roster_published",
      "onboarding_completed",
    ];
    for (const s of order) {
      stagesToEmit.push(s);
      if (s === p.stage) break;
    }
    if (p.extras?.completedAt && !stagesToEmit.includes("onboarding_completed")) {
      stagesToEmit.push("onboarding_completed");
    }

    for (const stage of stagesToEmit) {
      const key = milestoneIdempotencyKey(stage, {
        userId: user.id,
        organizationId: org.id,
        anonymousSessionId: `seed_${p.key}`,
      });
      await prisma.onboardingEvent.upsert({
        where: { idempotencyKey: key },
        create: {
          userId: user.id,
          organizationId: org.id,
          eventName: stage,
          source: "seed",
          idempotencyKey: key,
          metadata: { persona: p.key },
          createdAt: at,
        },
        update: {},
      });
    }

    const progress = await prisma.onboardingProgress.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        organizationId: org.id,
        contactName: p.name,
        contactEmail: p.email,
        businessName: p.business,
        currentStage: p.extras?.completedAt ? "onboarding_completed" : p.stage,
        highestStageReached: p.extras?.completedAt ? "onboarding_completed" : p.stage,
        signupStartedAt: at,
        lastActivityAt: p.extras?.resumedAfterFollowUp ? hoursAgo(1) : at,
        activatedAt: p.extras?.activatedAt ? hoursAgo(20) : null,
        completedAt: p.extras?.completedAt ? hoursAgo(18) : null,
        abandonedAt: p.extras?.abandonedAt ? hoursAgo(70) : null,
        abandonmentReason: p.extras?.abandonmentReason ?? null,
        needsSupport: p.extras?.needsSupport ?? false,
        doNotContact: p.extras?.doNotContact ?? false,
        followUpStatus: p.extras?.followUpStatus ?? "none",
        followUpCount: p.extras?.followUpFailed || p.extras?.resumedAfterFollowUp ? 1 : 0,
        lastFollowUpAt:
          p.extras?.followUpFailed || p.extras?.resumedAfterFollowUp ? hoursAgo(48) : null,
        signupSource: "seed",
      },
      update: {
        contactName: p.name,
        contactEmail: p.email,
        businessName: p.business,
        currentStage: p.extras?.completedAt ? "onboarding_completed" : p.stage,
        highestStageReached: p.extras?.completedAt ? "onboarding_completed" : p.stage,
        lastActivityAt: p.extras?.resumedAfterFollowUp ? hoursAgo(1) : at,
        activatedAt: p.extras?.activatedAt ? hoursAgo(20) : null,
        completedAt: p.extras?.completedAt ? hoursAgo(18) : null,
        abandonedAt: p.extras?.abandonedAt ? hoursAgo(70) : null,
        abandonmentReason: p.extras?.abandonmentReason ?? null,
        needsSupport: p.extras?.needsSupport ?? false,
        doNotContact: p.extras?.doNotContact ?? false,
        followUpStatus: p.extras?.followUpStatus ?? "none",
        signupSource: "seed",
      },
    });

    if (p.extras?.needsSupport) {
      const errKey = `error:roster_save_failure:req:seed_${p.key}`;
      await prisma.onboardingEvent.upsert({
        where: { idempotencyKey: errKey },
        create: {
          userId: user.id,
          organizationId: org.id,
          eventName: "error:roster_save_failure",
          source: "seed",
          idempotencyKey: errKey,
          metadata: {
            category: "roster_save_failure",
            message: "Seeded validation failure",
            step: "first_roster_created",
            requestId: `seed_${p.key}`,
          },
        },
        update: {},
      });
    }

    if (p.extras?.followUpFailed || p.extras?.resumedAfterFollowUp) {
      const fuKey = `seed:followup:${p.key}:1`;
      await prisma.onboardingFollowUp.upsert({
        where: { idempotencyKey: fuKey },
        create: {
          userId: user.id,
          organizationId: org.id,
          onboardingProgressId: progress.id,
          channel: "email",
          templateKey: "employees_no_roster",
          subject: "Create your first staff roster",
          status: p.extras.followUpFailed ? "failed" : "sent",
          sentAt: p.extras.followUpFailed ? null : hoursAgo(48),
          failedAt: p.extras.followUpFailed ? hoursAgo(48) : null,
          failureReason: p.extras.followUpFailed ? "Seeded provider failure" : null,
          initiatedBy: "system:seed",
          idempotencyKey: fuKey,
        },
        update: {
          status: p.extras.followUpFailed ? "failed" : "sent",
        },
      });
    }
  }

  console.log("Onboarding funnel seed personas OK:", personas.length);
}
