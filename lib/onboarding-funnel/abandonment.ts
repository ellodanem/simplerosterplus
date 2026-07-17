/**
 * Configurable abandonment thresholds and detection (no email send).
 * See docs/ONBOARDING_FUNNEL.md.
 */

import {
  ACTIVATION_STAGE,
  hasReachedStage,
  isOnboardingStage,
  type OnboardingStage,
} from "@/lib/onboarding-funnel/stages";

export type AbandonmentRules = {
  signupToAccountHours: number;
  accountToWorkspaceHours: number;
  workspaceToEmployeesHours: number;
  employeesToRosterHours: number;
  rosterToPublishHours: number;
  inactiveBeforeActivationHours: number;
};

const HOUR_MS = 60 * 60 * 1000;

function parsePositiveHours(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getAbandonmentRulesFromEnv(
  env: Record<string, string | undefined> = process.env,
): AbandonmentRules {
  return {
    signupToAccountHours: parsePositiveHours(env.ONBOARDING_ABANDON_SIGNUP_HOURS, 2),
    accountToWorkspaceHours: parsePositiveHours(env.ONBOARDING_ABANDON_WORKSPACE_HOURS, 24),
    workspaceToEmployeesHours: parsePositiveHours(
      env.ONBOARDING_ABANDON_EMPLOYEES_HOURS,
      24,
    ),
    employeesToRosterHours: parsePositiveHours(env.ONBOARDING_ABANDON_ROSTER_HOURS, 48),
    rosterToPublishHours: parsePositiveHours(env.ONBOARDING_ABANDON_PUBLISH_HOURS, 48),
    inactiveBeforeActivationHours: parsePositiveHours(
      env.ONBOARDING_ABANDON_INACTIVE_HOURS,
      72,
    ),
  };
}

export type ProgressAbandonmentInput = {
  highestStageReached: string;
  currentStage: string;
  signupStartedAt: Date | null;
  lastActivityAt: Date;
  activatedAt: Date | null;
  completedAt: Date | null;
  needsSupport: boolean;
  doNotContact: boolean;
};

export type AbandonmentVerdict =
  | { abandoned: false }
  | { abandoned: true; reason: string };

function hoursSince(from: Date, now: Date): number {
  return (now.getTime() - from.getTime()) / HOUR_MS;
}

/**
 * Pure abandonment check. Does not mark activated or needs_support users as abandoned.
 */
export function evaluateAbandonment(
  progress: ProgressAbandonmentInput,
  now: Date,
  rules: AbandonmentRules = getAbandonmentRulesFromEnv(),
): AbandonmentVerdict {
  if (progress.activatedAt) return { abandoned: false };
  if (progress.needsSupport) return { abandoned: false };

  const highest = isOnboardingStage(progress.highestStageReached)
    ? progress.highestStageReached
    : null;
  if (!highest) return { abandoned: false };

  const activityAnchor = progress.lastActivityAt;
  const signupAnchor = progress.signupStartedAt ?? progress.lastActivityAt;

  if (
    highest === "signup_started" &&
    hoursSince(signupAnchor, now) >= rules.signupToAccountHours
  ) {
    return { abandoned: true, reason: "signup_no_account" };
  }

  if (
    hasReachedStage(highest, "account_created") &&
    !hasReachedStage(highest, "workspace_created") &&
    hoursSince(activityAnchor, now) >= rules.accountToWorkspaceHours
  ) {
    return { abandoned: true, reason: "account_no_workspace" };
  }

  if (
    hasReachedStage(highest, "workspace_created") &&
    !hasReachedStage(highest, "employees_added") &&
    hoursSince(activityAnchor, now) >= rules.workspaceToEmployeesHours
  ) {
    return { abandoned: true, reason: "workspace_no_employees" };
  }

  if (
    hasReachedStage(highest, "employees_added") &&
    !hasReachedStage(highest, "first_roster_created") &&
    hoursSince(activityAnchor, now) >= rules.employeesToRosterHours
  ) {
    return { abandoned: true, reason: "employees_no_roster" };
  }

  if (
    hasReachedStage(highest, "first_roster_created") &&
    !hasReachedStage(highest, "first_roster_published") &&
    hoursSince(activityAnchor, now) >= rules.rosterToPublishHours
  ) {
    return { abandoned: true, reason: "roster_not_published" };
  }

  if (
    !hasReachedStage(highest, ACTIVATION_STAGE) &&
    hoursSince(activityAnchor, now) >= rules.inactiveBeforeActivationHours
  ) {
    return { abandoned: true, reason: "inactive_before_activation" };
  }

  return { abandoned: false };
}

/** Stages that are "stalled at" for Ops (same as currentStage when abandoned). */
export function stalledAtStage(progress: {
  currentStage: string;
  abandonedAt: Date | null;
}): OnboardingStage | null {
  if (!progress.abandonedAt) return null;
  return isOnboardingStage(progress.currentStage) ? progress.currentStage : null;
}
