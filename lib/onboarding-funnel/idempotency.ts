import type { OnboardingStage } from "@/lib/onboarding-funnel/stages";
import { isMilestoneStage } from "@/lib/onboarding-funnel/stages";

/** Build a stable milestone idempotency key. */
export function milestoneIdempotencyKey(
  stage: OnboardingStage,
  subject: {
    userId?: string | null;
    organizationId?: string | null;
    anonymousSessionId?: string | null;
  },
): string {
  switch (stage) {
    case "signup_started":
      return `stage:signup_started:anon:${subject.anonymousSessionId ?? "unknown"}`;
    case "account_created":
      return `stage:account_created:user:${subject.userId ?? "unknown"}`;
    case "email_verified":
      return `stage:email_verified:user:${subject.userId ?? "unknown"}`;
    case "workspace_created":
      return `stage:workspace_created:org:${subject.organizationId ?? "unknown"}`;
    case "business_details_completed":
      return `stage:business_details_completed:org:${subject.organizationId ?? "unknown"}`;
    case "employees_added":
      return `stage:employees_added:org:${subject.organizationId ?? "unknown"}`;
    case "first_roster_started":
      return `stage:first_roster_started:org:${subject.organizationId ?? "unknown"}`;
    case "first_roster_created":
      return `stage:first_roster_created:org:${subject.organizationId ?? "unknown"}`;
    case "first_roster_published":
      return `stage:first_roster_published:org:${subject.organizationId ?? "unknown"}`;
    case "attendance_setup_started":
      return `stage:attendance_setup_started:org:${subject.organizationId ?? "unknown"}`;
    case "attendance_device_connected":
      return `stage:attendance_device_connected:org:${subject.organizationId ?? "unknown"}`;
    case "onboarding_completed":
      return `stage:onboarding_completed:org:${subject.organizationId ?? "unknown"}`;
    default: {
      const _exhaustive: never = stage;
      return `stage:${_exhaustive}`;
    }
  }
}

/** Per-occurrence key for friction / error events. */
export function errorIdempotencyKey(category: string, requestId: string): string {
  return `error:${category}:req:${requestId}`;
}

export function isStableMilestoneKey(eventName: string, key: string): boolean {
  return isMilestoneStage(eventName) && key.startsWith("stage:");
}
