/**
 * Onboarding funnel stage catalog.
 * See docs/ONBOARDING_FUNNEL.md for definitions of currentStage / highestStageReached.
 */

export const ONBOARDING_STAGES = [
  "signup_started",
  "account_created",
  "email_verified",
  "workspace_created",
  "business_details_completed",
  "employees_added",
  "first_roster_started",
  "first_roster_created",
  "first_roster_published",
  "attendance_setup_started",
  "attendance_device_connected",
  "onboarding_completed",
] as const;

export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];

/** Primary activation milestone. */
export const ACTIVATION_STAGE: OnboardingStage = "first_roster_published";

/** Secondary activation signal (not used for activatedAt). */
export const SECONDARY_ACTIVATION_STAGE: OnboardingStage = "first_roster_created";

const STAGE_ORDINAL: Record<OnboardingStage, number> = {
  signup_started: 10,
  account_created: 20,
  email_verified: 30,
  workspace_created: 40,
  business_details_completed: 50,
  employees_added: 60,
  first_roster_started: 70,
  first_roster_created: 80,
  first_roster_published: 90,
  attendance_setup_started: 95,
  attendance_device_connected: 96,
  onboarding_completed: 100,
};

export function isOnboardingStage(value: string): value is OnboardingStage {
  return (ONBOARDING_STAGES as readonly string[]).includes(value);
}

export function stageOrdinal(stage: OnboardingStage): number {
  return STAGE_ORDINAL[stage];
}

/** Returns the stage with the higher ordinal. */
export function maxStage(a: OnboardingStage, b: OnboardingStage): OnboardingStage {
  return stageOrdinal(a) >= stageOrdinal(b) ? a : b;
}

/**
 * Whether `reached` is at least as far as `target` in the funnel.
 * Used for conversion counts (reached stage X).
 */
export function hasReachedStage(
  highestStageReached: string,
  target: OnboardingStage,
): boolean {
  if (!isOnboardingStage(highestStageReached)) return false;
  return stageOrdinal(highestStageReached) >= stageOrdinal(target);
}

/** Milestone events that advance progress via stable idempotency keys. */
export function isMilestoneStage(eventName: string): eventName is OnboardingStage {
  return isOnboardingStage(eventName);
}
