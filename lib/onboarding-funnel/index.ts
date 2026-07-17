export {
  ONBOARDING_STAGES,
  ACTIVATION_STAGE,
  SECONDARY_ACTIVATION_STAGE,
  isOnboardingStage,
  stageOrdinal,
  maxStage,
  hasReachedStage,
  type OnboardingStage,
} from "@/lib/onboarding-funnel/stages";

export {
  recordOnboardingEvent,
  recordMilestone,
  recordOnboardingError,
  linkAnonymousOnboardingSession,
  trackOnboardingMilestone,
  trackOnboardingError,
  ONBOARDING_ANON_COOKIE,
} from "@/lib/onboarding-funnel/record-event";

export { milestoneIdempotencyKey, errorIdempotencyKey } from "@/lib/onboarding-funnel/idempotency";
export { sanitizeMetadata, sanitizeErrorDetails } from "@/lib/onboarding-funnel/sanitize";
export {
  evaluateAbandonment,
  getAbandonmentRulesFromEnv,
  type AbandonmentRules,
} from "@/lib/onboarding-funnel/abandonment";
export {
  evaluateFollowUpEligibility,
  isOnboardingAutomationEnabled,
  getMaxFollowUps,
  recommendFollowUpTemplate,
} from "@/lib/onboarding-funnel/eligibility";
export {
  applyMilestoneToProgress,
  mergeProgressSnapshots,
  applySupportFlag,
} from "@/lib/onboarding-funnel/progress";
