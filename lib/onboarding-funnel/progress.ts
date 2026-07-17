import {
  ACTIVATION_STAGE,
  isOnboardingStage,
  maxStage,
  type OnboardingStage,
} from "@/lib/onboarding-funnel/stages";

/** Snapshot of progress fields used by pure aggregation helpers. */
export type ProgressSnapshot = {
  userId: string | null;
  organizationId: string | null;
  anonymousSessionId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  businessName: string | null;
  currentStage: OnboardingStage;
  highestStageReached: OnboardingStage;
  signupStartedAt: Date | null;
  lastActivityAt: Date;
  activatedAt: Date | null;
  completedAt: Date | null;
  abandonedAt: Date | null;
  abandonmentReason: string | null;
  needsSupport: boolean;
  supportResolvedAt: Date | null;
  signupSource: string | null;
};

export type MilestoneApplyInput = {
  stage: OnboardingStage;
  at: Date;
  organizationId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  businessName?: string | null;
  signupSource?: string | null;
};

/**
 * Apply a milestone to a progress snapshot.
 * - highestStageReached never regresses
 * - currentStage tracks highest (see docs/ONBOARDING_FUNNEL.md)
 * - activatedAt set only on first_roster_published
 * - completedAt set only on onboarding_completed
 * - resume clears abandonment
 */
export function applyMilestoneToProgress(
  prev: ProgressSnapshot,
  input: MilestoneApplyInput,
): ProgressSnapshot {
  const highest = maxStage(prev.highestStageReached, input.stage);
  const next: ProgressSnapshot = {
    ...prev,
    highestStageReached: highest,
    currentStage: highest,
    lastActivityAt: input.at,
    abandonedAt: null,
    abandonmentReason: null,
    organizationId: input.organizationId ?? prev.organizationId,
    contactName: input.contactName ?? prev.contactName,
    contactEmail: input.contactEmail ?? prev.contactEmail,
    businessName: input.businessName ?? prev.businessName,
    signupSource: input.signupSource ?? prev.signupSource,
  };

  if (input.stage === "signup_started" && !next.signupStartedAt) {
    next.signupStartedAt = input.at;
  }

  if (input.stage === ACTIVATION_STAGE && !next.activatedAt) {
    next.activatedAt = input.at;
  }

  if (input.stage === "onboarding_completed" && !next.completedAt) {
    next.completedAt = input.at;
  }

  return next;
}

/** Merge anonymous progress into a user-keyed row (or the reverse when only anon exists). */
export function mergeProgressSnapshots(
  primary: ProgressSnapshot,
  secondary: ProgressSnapshot,
  at: Date,
): ProgressSnapshot {
  const highest = maxStage(primary.highestStageReached, secondary.highestStageReached);
  return {
    userId: primary.userId ?? secondary.userId,
    organizationId: primary.organizationId ?? secondary.organizationId,
    anonymousSessionId: null,
    contactName: primary.contactName ?? secondary.contactName,
    contactEmail: primary.contactEmail ?? secondary.contactEmail,
    businessName: primary.businessName ?? secondary.businessName,
    currentStage: highest,
    highestStageReached: highest,
    signupStartedAt: earliest(primary.signupStartedAt, secondary.signupStartedAt),
    lastActivityAt: at.getTime() >= primary.lastActivityAt.getTime() ? at : primary.lastActivityAt,
    activatedAt: primary.activatedAt ?? secondary.activatedAt,
    completedAt: primary.completedAt ?? secondary.completedAt,
    abandonedAt: null,
    abandonmentReason: null,
    needsSupport: primary.needsSupport || secondary.needsSupport,
    supportResolvedAt: primary.supportResolvedAt ?? secondary.supportResolvedAt,
    signupSource: primary.signupSource ?? secondary.signupSource,
  };
}

function earliest(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() <= b.getTime() ? a : b;
}

export function applySupportFlag(
  prev: ProgressSnapshot,
  needsSupport: boolean,
  at: Date,
): ProgressSnapshot {
  return {
    ...prev,
    needsSupport,
    supportResolvedAt: needsSupport ? null : at,
    lastActivityAt: at,
    // Product errors are not treated as normal abandonment.
    abandonedAt: needsSupport ? null : prev.abandonedAt,
    abandonmentReason: needsSupport ? null : prev.abandonmentReason,
  };
}

export function parseStageOrDefault(
  value: string,
  fallback: OnboardingStage = "signup_started",
): OnboardingStage {
  return isOnboardingStage(value) ? value : fallback;
}
