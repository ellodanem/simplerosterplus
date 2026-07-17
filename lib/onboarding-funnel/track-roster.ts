import { prisma } from "@/lib/prisma";
import { trackOrgMilestone, trackOrgOnboardingError } from "@/lib/onboarding-funnel/track-org";

/** After a roster entry write, emit first_roster_created once the org has ≥1 entry. */
export function maybeTrackFirstRosterCreated(args: {
  organizationId: string;
  userId?: string | null;
  source: string;
}): void {
  void (async () => {
    const any = await prisma.rosterEntry.findFirst({
      where: { rosterWeek: { organizationId: args.organizationId } },
      select: { id: true },
    });
    if (!any) return;
    trackOrgMilestone({
      stage: "first_roster_created",
      organizationId: args.organizationId,
      userId: args.userId,
      source: args.source,
    });
  })().catch((err) => {
    console.error("[onboarding-funnel] first_roster_created check failed", err);
  });
}

export function trackFirstRosterStarted(args: {
  organizationId: string;
  userId?: string | null;
  source?: string;
}): void {
  trackOrgMilestone({
    stage: "first_roster_started",
    organizationId: args.organizationId,
    userId: args.userId,
    source: args.source ?? "roster_page",
  });
}

export function trackRosterPublished(args: {
  organizationId: string;
  userId?: string | null;
}): void {
  trackOrgMilestone({
    stage: "first_roster_published",
    organizationId: args.organizationId,
    userId: args.userId,
    source: "roster_publish",
  });
}

export function trackRosterPublishFailure(args: {
  organizationId: string;
  userId?: string | null;
  message?: string | null;
}): void {
  trackOrgOnboardingError({
    category: "roster_publish_failure",
    organizationId: args.organizationId,
    userId: args.userId,
    source: "roster_publish",
    message: args.message,
    step: "first_roster_published",
  });
}
