import { afterEach, describe, expect, it } from "vitest";
import {
  automaticSequenceDelayHours,
  automaticSequenceScheduledFor,
  scheduleAutomaticOnboardingFollowUps,
} from "@/lib/onboarding-funnel/automation";

const originalAutomationFlag = process.env.ONBOARDING_AUTOMATION_ENABLED;

afterEach(() => {
  if (originalAutomationFlag == null) {
    delete process.env.ONBOARDING_AUTOMATION_ENABLED;
  } else {
    process.env.ONBOARDING_AUTOMATION_ENABLED = originalAutomationFlag;
  }
});

describe("automatic follow-up sequence", () => {
  it("uses 24 hours, then 3 days, then 5 days", () => {
    const env = {};
    expect(automaticSequenceDelayHours(1, env)).toBe(24);
    expect(automaticSequenceDelayHours(2, env)).toBe(72);
    expect(automaticSequenceDelayHours(3, env)).toBe(120);
  });

  it("anchors the first message to activity and later messages to the prior send", () => {
    const activity = new Date("2026-07-01T12:00:00.000Z");
    const priorSend = new Date("2026-07-03T12:00:00.000Z");
    expect(
      automaticSequenceScheduledFor({
        step: 1,
        lastActivityAt: activity,
        lastFollowUpAt: null,
      }).toISOString(),
    ).toBe("2026-07-02T12:00:00.000Z");
    expect(
      automaticSequenceScheduledFor({
        step: 2,
        lastActivityAt: activity,
        lastFollowUpAt: priorSend,
      }).toISOString(),
    ).toBe("2026-07-06T12:00:00.000Z");
    expect(
      automaticSequenceScheduledFor({
        step: 3,
        lastActivityAt: activity,
        lastFollowUpAt: priorSend,
      }).toISOString(),
    ).toBe("2026-07-08T12:00:00.000Z");
  });

  it("does not query or schedule when automation is disabled", async () => {
    process.env.ONBOARDING_AUTOMATION_ENABLED = "false";
    await expect(scheduleAutomaticOnboardingFollowUps()).resolves.toEqual({
      enabled: false,
      scanned: 0,
      scheduled: 0,
      suppressed: 0,
    });
  });
});
