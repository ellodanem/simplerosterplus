/**
 * Follow-up eligibility (manual + future automation). No sends here.
 */

import { hasReachedStage } from "@/lib/onboarding-funnel/stages";

export type FollowUpEligibilityInput = {
  activatedAt: Date | null;
  completedAt: Date | null;
  doNotContact: boolean;
  needsSupport: boolean;
  followUpCount: number;
  maxFollowUps: number;
  contactEmail: string | null;
  /** Org flags */
  isDemo?: boolean;
  isOnboardingSandbox?: boolean;
  suspendedAt?: Date | null;
  /** Internal / test account heuristics */
  isInternalTest?: boolean;
  /** User recently resumed (activity after last follow-up). */
  resumedRecently?: boolean;
  /** Pending system error requiring support. */
  knownSystemError?: boolean;
};

export function getMaxFollowUps(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.ONBOARDING_MAX_FOLLOW_UPS ?? "3");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
}

export function isOnboardingAutomationEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.ONBOARDING_AUTOMATION_ENABLED?.trim() === "true";
}

export type EligibilityResult = {
  eligible: boolean;
  reason?: string;
};

export function evaluateFollowUpEligibility(
  input: FollowUpEligibilityInput,
): EligibilityResult {
  if (input.doNotContact) return { eligible: false, reason: "do_not_contact" };
  if (input.completedAt) return { eligible: false, reason: "onboarding_completed" };
  if (input.activatedAt) return { eligible: false, reason: "activated" };
  if (input.needsSupport || input.knownSystemError) {
    return { eligible: false, reason: "needs_support" };
  }
  if (input.isDemo || input.isOnboardingSandbox) {
    return { eligible: false, reason: "demo_or_sandbox" };
  }
  if (input.suspendedAt) return { eligible: false, reason: "suspended" };
  if (input.isInternalTest) return { eligible: false, reason: "internal_test" };
  if (!input.contactEmail?.includes("@")) {
    return { eligible: false, reason: "no_usable_email" };
  }
  if (input.followUpCount >= input.maxFollowUps) {
    return { eligible: false, reason: "max_follow_ups" };
  }
  if (input.resumedRecently) return { eligible: false, reason: "resumed_recently" };
  return { eligible: true };
}

/** Template recommendation from highest stage (manual Ops). */
export function recommendFollowUpTemplate(
  highestStageReached: string,
): string {
  if (!hasReachedStage(highestStageReached, "workspace_created")) {
    return "account_workspace_incomplete";
  }
  if (!hasReachedStage(highestStageReached, "employees_added")) {
    return "workspace_no_employees";
  }
  if (!hasReachedStage(highestStageReached, "first_roster_created")) {
    return "employees_no_roster";
  }
  if (!hasReachedStage(highestStageReached, "first_roster_published")) {
    return "roster_not_published";
  }
  return "general_stalled";
}
