import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { trackOnboardingError, trackOnboardingMilestone } from "@/lib/onboarding-funnel/record-event";
import type { OnboardingStage } from "@/lib/onboarding-funnel/stages";

type OrgMilestone =
  | "business_details_completed"
  | "employees_added"
  | "first_roster_started"
  | "first_roster_created"
  | "first_roster_published"
  | "attendance_setup_started"
  | "attendance_device_connected"
  | "onboarding_completed";

/** Resolve owner AppUser for org-scoped funnel events. */
export async function ownerUserIdForOrg(organizationId: string): Promise<string | null> {
  const owner = await prisma.appUser.findFirst({
    where: { organizationId, role: "owner" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (owner) return owner.id;
  const any = await prisma.appUser.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return any?.id ?? null;
}

async function trackOrgMilestoneAsync(args: {
  stage: OrgMilestone;
  organizationId: string;
  userId?: string | null;
  source: string;
  metadata?: Record<string, unknown>;
  businessName?: string | null;
}): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: args.organizationId },
    select: { name: true, isDemo: true, isOnboardingSandbox: true },
  });
  if (!org || org.isDemo || org.isOnboardingSandbox) return;

  const userId = args.userId ?? (await ownerUserIdForOrg(args.organizationId));
  let contactEmail: string | null = null;
  if (userId) {
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    contactEmail = user?.email ?? null;
  }

  trackOnboardingMilestone({
    stage: args.stage as OnboardingStage,
    source: args.source,
    userId,
    organizationId: args.organizationId,
    contactEmail,
    businessName: args.businessName ?? org.name,
    metadata: args.metadata,
  });
}

/** Fire-and-forget org milestone. */
export function trackOrgMilestone(args: {
  stage: OrgMilestone;
  organizationId: string;
  userId?: string | null;
  source: string;
  metadata?: Record<string, unknown>;
  businessName?: string | null;
}): void {
  void trackOrgMilestoneAsync(args).catch((err) => {
    console.error("[onboarding-funnel] org milestone failed", { stage: args.stage, err });
  });
}

export function trackOrgOnboardingError(args: {
  category: string;
  organizationId: string;
  userId?: string | null;
  source: string;
  message?: string | null;
  step?: string | null;
}): void {
  void (async () => {
    const org = await prisma.organization.findUnique({
      where: { id: args.organizationId },
      select: { isDemo: true, isOnboardingSandbox: true },
    });
    if (!org || org.isDemo || org.isOnboardingSandbox) return;
    trackOnboardingError({
      category: args.category,
      source: args.source,
      requestId: randomUUID(),
      userId: args.userId,
      organizationId: args.organizationId,
      message: args.message,
      step: args.step,
    });
  })().catch((err) => {
    console.error("[onboarding-funnel] org error track failed", err);
  });
}
