import { describe, expect, it } from "vitest";
import {
  ACTIVATION_STAGE,
  hasReachedStage,
  maxStage,
  ONBOARDING_STAGES,
  stageOrdinal,
} from "@/lib/onboarding-funnel/stages";
import {
  applyMilestoneToProgress,
  applySupportFlag,
  mergeProgressSnapshots,
  type ProgressSnapshot,
} from "@/lib/onboarding-funnel/progress";
import { milestoneIdempotencyKey, errorIdempotencyKey } from "@/lib/onboarding-funnel/idempotency";
import { sanitizeErrorDetails, sanitizeMetadata } from "@/lib/onboarding-funnel/sanitize";
import {
  evaluateAbandonment,
  type AbandonmentRules,
} from "@/lib/onboarding-funnel/abandonment";
import {
  evaluateFollowUpEligibility,
  isOnboardingAutomationEnabled,
} from "@/lib/onboarding-funnel/eligibility";

const RULES: AbandonmentRules = {
  signupToAccountHours: 2,
  accountToWorkspaceHours: 24,
  workspaceToEmployeesHours: 24,
  employeesToRosterHours: 48,
  rosterToPublishHours: 48,
  inactiveBeforeActivationHours: 72,
};

function baseProgress(overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  const now = new Date("2026-07-16T12:00:00.000Z");
  return {
    userId: "user_1",
    organizationId: "org_1",
    anonymousSessionId: null,
    contactName: "Dane",
    contactEmail: "dane@example.com",
    businessName: "Cafe",
    currentStage: "signup_started",
    highestStageReached: "signup_started",
    signupStartedAt: now,
    lastActivityAt: now,
    activatedAt: null,
    completedAt: null,
    abandonedAt: null,
    abandonmentReason: null,
    needsSupport: false,
    supportResolvedAt: null,
    signupSource: "self_serve",
    ...overrides,
  };
}

describe("stage ordering", () => {
  it("keeps a strict ordinal order for milestones", () => {
    for (let i = 1; i < ONBOARDING_STAGES.length; i++) {
      expect(stageOrdinal(ONBOARDING_STAGES[i]!)).toBeGreaterThan(
        stageOrdinal(ONBOARDING_STAGES[i - 1]!),
      );
    }
  });

  it("treats first_roster_published as activation stage", () => {
    expect(ACTIVATION_STAGE).toBe("first_roster_published");
    expect(hasReachedStage("first_roster_published", "first_roster_created")).toBe(true);
    expect(hasReachedStage("employees_added", "first_roster_published")).toBe(false);
  });

  it("maxStage never picks a lower ordinal", () => {
    expect(maxStage("employees_added", "signup_started")).toBe("employees_added");
    expect(maxStage("onboarding_completed", "first_roster_published")).toBe(
      "onboarding_completed",
    );
  });
});

describe("progress aggregation", () => {
  it("advances highestStageReached and never regresses", () => {
    let p = baseProgress();
    const t1 = new Date("2026-07-16T13:00:00.000Z");
    p = applyMilestoneToProgress(p, { stage: "account_created", at: t1 });
    p = applyMilestoneToProgress(p, { stage: "workspace_created", at: t1 });
    p = applyMilestoneToProgress(p, { stage: "account_created", at: t1 });
    expect(p.highestStageReached).toBe("workspace_created");
    expect(p.currentStage).toBe("workspace_created");
  });

  it("separates activation and onboarding completion", () => {
    let p = baseProgress({ highestStageReached: "employees_added", currentStage: "employees_added" });
    const at = new Date("2026-07-17T12:00:00.000Z");
    p = applyMilestoneToProgress(p, { stage: "first_roster_published", at });
    expect(p.activatedAt?.toISOString()).toBe(at.toISOString());
    expect(p.completedAt).toBeNull();

    p = applyMilestoneToProgress(p, { stage: "onboarding_completed", at });
    expect(p.completedAt?.toISOString()).toBe(at.toISOString());
    expect(p.activatedAt?.toISOString()).toBe(at.toISOString());
  });

  it("does not set completedAt when only publishing", () => {
    const p = applyMilestoneToProgress(baseProgress(), {
      stage: "first_roster_published",
      at: new Date(),
    });
    expect(p.completedAt).toBeNull();
    expect(p.activatedAt).not.toBeNull();
  });

  it("clears abandonment on resume activity", () => {
    const p = applyMilestoneToProgress(
      baseProgress({
        abandonedAt: new Date("2026-07-15T00:00:00.000Z"),
        abandonmentReason: "inactive_before_activation",
        highestStageReached: "employees_added",
        currentStage: "employees_added",
      }),
      { stage: "first_roster_started", at: new Date("2026-07-16T18:00:00.000Z") },
    );
    expect(p.abandonedAt).toBeNull();
    expect(p.abandonmentReason).toBeNull();
  });

  it("applies each funnel milestone in sequence", () => {
    let p = baseProgress({
      userId: null,
      organizationId: null,
      highestStageReached: "signup_started",
      currentStage: "signup_started",
    });
    const at = new Date();
    for (const stage of ONBOARDING_STAGES) {
      if (stage === "signup_started") continue;
      p = applyMilestoneToProgress(p, { stage, at });
    }
    expect(p.highestStageReached).toBe("onboarding_completed");
    expect(p.activatedAt).not.toBeNull();
    expect(p.completedAt).not.toBeNull();
  });
});

describe("anonymous-to-user linking", () => {
  it("merges anon into user without regressing highest stage", () => {
    const at = new Date("2026-07-16T15:00:00.000Z");
    const user = baseProgress({
      highestStageReached: "account_created",
      currentStage: "account_created",
      anonymousSessionId: null,
      signupStartedAt: null,
    });
    const anon = baseProgress({
      userId: null,
      organizationId: null,
      anonymousSessionId: "anon_abc",
      highestStageReached: "signup_started",
      currentStage: "signup_started",
      signupStartedAt: new Date("2026-07-16T10:00:00.000Z"),
      contactEmail: "early@example.com",
    });
    const merged = mergeProgressSnapshots(user, anon, at);
    expect(merged.userId).toBe("user_1");
    expect(merged.anonymousSessionId).toBeNull();
    expect(merged.highestStageReached).toBe("account_created");
    expect(merged.signupStartedAt?.toISOString()).toBe("2026-07-16T10:00:00.000Z");
    expect(merged.abandonedAt).toBeNull();
  });

  it("takes the higher stage when anon progressed further", () => {
    const merged = mergeProgressSnapshots(
      baseProgress({ highestStageReached: "account_created", currentStage: "account_created" }),
      baseProgress({
        userId: null,
        anonymousSessionId: "anon_1",
        highestStageReached: "workspace_created",
        currentStage: "workspace_created",
      }),
      new Date(),
    );
    expect(merged.highestStageReached).toBe("workspace_created");
  });
});

describe("event idempotency keys", () => {
  it("builds stable milestone keys", () => {
    expect(
      milestoneIdempotencyKey("account_created", { userId: "u1" }),
    ).toBe("stage:account_created:user:u1");
    expect(
      milestoneIdempotencyKey("first_roster_published", { organizationId: "o1" }),
    ).toBe("stage:first_roster_published:org:o1");
    expect(
      milestoneIdempotencyKey("signup_started", { anonymousSessionId: "a1" }),
    ).toBe("stage:signup_started:anon:a1");
  });

  it("builds unique error keys per request", () => {
    expect(errorIdempotencyKey("roster_publish_failure", "req_1")).toBe(
      "error:roster_publish_failure:req:req_1",
    );
    expect(errorIdempotencyKey("roster_publish_failure", "req_2")).not.toBe(
      errorIdempotencyKey("roster_publish_failure", "req_1"),
    );
  });
});

describe("metadata sanitization", () => {
  it("strips secrets and sensitive keys", () => {
    const cleaned = sanitizeMetadata({
      step: "publish",
      password: "secret",
      accessToken: "tok",
      api_key: "k",
      orgId: "org_1",
    });
    expect(cleaned).toEqual({ step: "publish", orgId: "org_1" });
  });

  it("sanitizes error details without stacks", () => {
    const cleaned = sanitizeErrorDetails({
      category: "roster_save_failure",
      message: "Validation failed",
      step: "first_roster_created",
      requestId: "req_9",
    });
    expect(cleaned.category).toBe("roster_save_failure");
    expect(cleaned.requestId).toBe("req_9");
    expect(JSON.stringify(cleaned)).not.toContain("at Object.");
  });
});

describe("abandonment detection", () => {
  const now = new Date("2026-07-16T12:00:00.000Z");

  it("marks signup_started abandoned after threshold", () => {
    const verdict = evaluateAbandonment(
      {
        highestStageReached: "signup_started",
        currentStage: "signup_started",
        signupStartedAt: new Date("2026-07-16T09:00:00.000Z"),
        lastActivityAt: new Date("2026-07-16T09:00:00.000Z"),
        activatedAt: null,
        completedAt: null,
        needsSupport: false,
        doNotContact: false,
      },
      now,
      RULES,
    );
    expect(verdict).toEqual({ abandoned: true, reason: "signup_no_account" });
  });

  it("excludes activated users", () => {
    const verdict = evaluateAbandonment(
      {
        highestStageReached: "first_roster_published",
        currentStage: "first_roster_published",
        signupStartedAt: new Date("2026-07-01T00:00:00.000Z"),
        lastActivityAt: new Date("2026-07-01T00:00:00.000Z"),
        activatedAt: new Date("2026-07-02T00:00:00.000Z"),
        completedAt: null,
        needsSupport: false,
        doNotContact: false,
      },
      now,
      RULES,
    );
    expect(verdict).toEqual({ abandoned: false });
  });

  it("excludes needs_support from normal abandonment", () => {
    const verdict = evaluateAbandonment(
      {
        highestStageReached: "employees_added",
        currentStage: "employees_added",
        signupStartedAt: new Date("2026-07-01T00:00:00.000Z"),
        lastActivityAt: new Date("2026-07-01T00:00:00.000Z"),
        activatedAt: null,
        completedAt: null,
        needsSupport: true,
        doNotContact: false,
      },
      now,
      RULES,
    );
    expect(verdict).toEqual({ abandoned: false });
  });

  it("detects roster_not_published", () => {
    const verdict = evaluateAbandonment(
      {
        highestStageReached: "first_roster_created",
        currentStage: "first_roster_created",
        signupStartedAt: new Date("2026-07-01T00:00:00.000Z"),
        lastActivityAt: new Date("2026-07-13T12:00:00.000Z"),
        activatedAt: null,
        completedAt: null,
        needsSupport: false,
        doNotContact: false,
      },
      now,
      RULES,
    );
    expect(verdict).toEqual({ abandoned: true, reason: "roster_not_published" });
  });
});

describe("exclusion rules for follow-up", () => {
  it("blocks do_not_contact, activated, completed, needs_support, and missing email", () => {
    expect(
      evaluateFollowUpEligibility({
        activatedAt: null,
        completedAt: null,
        doNotContact: true,
        needsSupport: false,
        followUpCount: 0,
        maxFollowUps: 3,
        contactEmail: "a@b.com",
      }).reason,
    ).toBe("do_not_contact");

    expect(
      evaluateFollowUpEligibility({
        activatedAt: new Date(),
        completedAt: null,
        doNotContact: false,
        needsSupport: false,
        followUpCount: 0,
        maxFollowUps: 3,
        contactEmail: "a@b.com",
      }).reason,
    ).toBe("activated");

    expect(
      evaluateFollowUpEligibility({
        activatedAt: null,
        completedAt: new Date(),
        doNotContact: false,
        needsSupport: false,
        followUpCount: 0,
        maxFollowUps: 3,
        contactEmail: "a@b.com",
      }).reason,
    ).toBe("onboarding_completed");

    expect(
      evaluateFollowUpEligibility({
        activatedAt: null,
        completedAt: null,
        doNotContact: false,
        needsSupport: true,
        followUpCount: 0,
        maxFollowUps: 3,
        contactEmail: "a@b.com",
      }).reason,
    ).toBe("needs_support");

    expect(
      evaluateFollowUpEligibility({
        activatedAt: null,
        completedAt: null,
        doNotContact: false,
        needsSupport: false,
        followUpCount: 0,
        maxFollowUps: 3,
        contactEmail: null,
      }).reason,
    ).toBe("no_usable_email");
  });

  it("keeps automation disabled by default", () => {
    expect(isOnboardingAutomationEnabled({})).toBe(false);
    expect(isOnboardingAutomationEnabled({ ONBOARDING_AUTOMATION_ENABLED: "false" })).toBe(
      false,
    );
    expect(isOnboardingAutomationEnabled({ ONBOARDING_AUTOMATION_ENABLED: "true" })).toBe(
      true,
    );
  });
});

describe("needsSupport flag", () => {
  it("sets needsSupport and clears abandonment", () => {
    const p = applySupportFlag(
      baseProgress({
        abandonedAt: new Date(),
        abandonmentReason: "inactive_before_activation",
      }),
      true,
      new Date("2026-07-16T20:00:00.000Z"),
    );
    expect(p.needsSupport).toBe(true);
    expect(p.abandonedAt).toBeNull();
  });
});
