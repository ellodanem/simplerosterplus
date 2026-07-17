import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendDetailed: vi.fn(),
  progressFindUnique: vi.fn(),
  progressUpdate: vi.fn(),
  followUpFindUnique: vi.fn(),
  followUpCount: vi.fn(),
  followUpCreate: vi.fn(),
  followUpUpdate: vi.fn(),
  followUpFindFirst: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/email/send", () => ({
  sendResendEmailDetailed: mocks.sendDetailed,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    onboardingProgress: {
      findUnique: mocks.progressFindUnique,
      update: mocks.progressUpdate,
    },
    onboardingFollowUp: {
      findUnique: mocks.followUpFindUnique,
      count: mocks.followUpCount,
      create: mocks.followUpCreate,
      update: mocks.followUpUpdate,
      findFirst: mocks.followUpFindFirst,
    },
    $transaction: mocks.transaction,
  },
}));

import {
  recommendedOnboardingFollowUpTemplate,
  renderOnboardingFollowUp,
} from "@/lib/email/onboarding-followup";
import {
  previewOnboardingFollowUp,
  sendManualOnboardingFollowUp,
} from "@/lib/onboarding-funnel/follow-up";

const progress = {
  id: "progress_1",
  userId: "user_1",
  organizationId: "org_1",
  contactName: "Dana Manager",
  contactEmail: "dana@example.com",
  businessName: "Dana's Cafe",
  currentStage: "employees_added",
  highestStageReached: "employees_added",
  activatedAt: null,
  completedAt: null,
  doNotContact: false,
  needsSupport: false,
  followUpCount: 0,
  lastFollowUpAt: null,
  lastActivityAt: new Date("2026-07-17T10:00:00.000Z"),
  organization: {
    isDemo: false,
    isOnboardingSandbox: false,
    suspendedAt: null,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.progressFindUnique.mockResolvedValue(progress);
  mocks.progressUpdate.mockResolvedValue(progress);
  mocks.followUpFindUnique.mockResolvedValue(null);
  mocks.followUpCount.mockResolvedValue(0);
  mocks.followUpCreate.mockResolvedValue({ id: "followup_1" });
  mocks.followUpUpdate.mockResolvedValue({ id: "followup_1" });
  mocks.followUpFindFirst.mockResolvedValue(null);
  mocks.sendDetailed.mockResolvedValue({
    ok: true,
    providerMessageId: "resend_1",
  });
  mocks.transaction.mockImplementation(async (operations: unknown) => {
    if (Array.isArray(operations)) return Promise.all(operations);
    throw new Error("Unexpected transaction form");
  });
});

describe("onboarding follow-up templates", () => {
  it("maps funnel stages to the appropriate recovery template", () => {
    expect(recommendedOnboardingFollowUpTemplate("account_created")).toBe(
      "account_workspace_incomplete",
    );
    expect(recommendedOnboardingFollowUpTemplate("workspace_created")).toBe(
      "workspace_no_employees",
    );
    expect(recommendedOnboardingFollowUpTemplate("employees_added")).toBe(
      "employees_no_roster",
    );
    expect(recommendedOnboardingFollowUpTemplate("first_roster_created")).toBe(
      "roster_not_published",
    );
  });

  it("renders neutral branded text and escaped HTML", () => {
    const rendered = renderOnboardingFollowUp({
      templateKey: "employees_no_roster",
      firstName: "Dana",
      businessName: "<Dana's Cafe>",
      currentStage: "employees_added",
      continueSetupUrl: "https://app.simplerosterplus.com/roster?a=1&b=2",
      supportEmail: "help@example.com",
    });
    expect(rendered.subject).toBe("Create your first staff roster");
    expect(rendered.text).toContain("Hi Dana,");
    expect(rendered.text).toContain("build the next weekly roster");
    expect(rendered.html).toContain("Simple Roster Plus");
    expect(rendered.html).toContain("&lt;Dana&#039;s Cafe&gt;");
    expect(rendered.html).not.toContain("<Dana's Cafe>");
  });
});

describe("manual onboarding follow-up", () => {
  it("previews the recommended message without sending", async () => {
    const preview = await previewOnboardingFollowUp("progress_1");
    expect(preview.eligible).toBe(true);
    expect(preview.to).toBe("dana@example.com");
    expect(preview.template.templateKey).toBe("employees_no_roster");
    expect(mocks.sendDetailed).not.toHaveBeenCalled();
  });

  it("persists sending before provider delivery and marks sent", async () => {
    const result = await sendManualOnboardingFollowUp({
      progressId: "progress_1",
      operatorUserId: "operator_1",
      requestKey: "request_key_1234",
      now: new Date("2026-07-17T12:00:00.000Z"),
    });

    expect(mocks.followUpCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "sending",
          templateKey: "employees_no_roster",
          idempotencyKey:
            "manual:send:progress_1:request_key_1234",
        }),
      }),
    );
    expect(mocks.sendDetailed).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "dana@example.com",
        subject: "Create your first staff roster",
      }),
    );
    expect(mocks.followUpUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "sent",
          providerMessageId: "resend_1",
        }),
      }),
    );
    expect(result).toEqual({
      followUpId: "followup_1",
      status: "sent",
      duplicate: false,
      providerMessageId: "resend_1",
    });
  });

  it("returns an existing record for a duplicate request key", async () => {
    mocks.followUpFindUnique.mockResolvedValue({
      id: "followup_existing",
      status: "sent",
      providerMessageId: "resend_existing",
    });

    const result = await sendManualOnboardingFollowUp({
      progressId: "progress_1",
      operatorUserId: "operator_1",
      requestKey: "request_key_1234",
    });

    expect(result.duplicate).toBe(true);
    expect(result.followUpId).toBe("followup_existing");
    expect(mocks.followUpCreate).not.toHaveBeenCalled();
    expect(mocks.sendDetailed).not.toHaveBeenCalled();
  });

  it("blocks sending to suppressed leads", async () => {
    mocks.progressFindUnique.mockResolvedValue({
      ...progress,
      doNotContact: true,
    });
    await expect(
      sendManualOnboardingFollowUp({
        progressId: "progress_1",
        operatorUserId: "operator_1",
        requestKey: "request_key_1234",
      }),
    ).rejects.toMatchObject({
      code: "not_eligible",
      status: 409,
    });
    expect(mocks.sendDetailed).not.toHaveBeenCalled();
  });
});
