import { Prisma } from "@prisma/client";
import { sendResendEmailDetailed } from "@/lib/email/send";
import {
  isOnboardingFollowUpTemplateKey,
  recommendedOnboardingFollowUpTemplate,
  renderOnboardingFollowUp,
  type OnboardingFollowUpTemplateKey,
  type RenderedOnboardingFollowUp,
} from "@/lib/email/onboarding-followup";
import {
  evaluateFollowUpEligibility,
  getMaxFollowUps,
} from "@/lib/onboarding-funnel/eligibility";
import { prisma } from "@/lib/prisma";

const HOUR_MS = 60 * 60 * 1000;
const REQUEST_KEY_RE = /^[a-zA-Z0-9:_-]{8,160}$/;

export class OnboardingFollowUpError extends Error {
  constructor(
    public readonly code:
      | "not_found"
      | "not_eligible"
      | "rate_limited"
      | "invalid_request"
      | "provider_failed",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "OnboardingFollowUpError";
  }
}

type FollowUpContext = {
  progress: {
    id: string;
    userId: string | null;
    organizationId: string | null;
    contactName: string | null;
    contactEmail: string | null;
    businessName: string | null;
    currentStage: string;
    highestStageReached: string;
    activatedAt: Date | null;
    completedAt: Date | null;
    doNotContact: boolean;
    needsSupport: boolean;
    followUpCount: number;
    lastFollowUpAt: Date | null;
    lastActivityAt: Date;
  };
  organization: {
    isDemo: boolean;
    isOnboardingSandbox: boolean;
    suspendedAt: Date | null;
  } | null;
};

export type OnboardingFollowUpPreview = {
  progressId: string;
  to: string | null;
  eligible: boolean;
  ineligibleReason: string | null;
  template: RenderedOnboardingFollowUp;
};

function firstName(contactName: string | null): string | null {
  return contactName?.trim().split(/\s+/)[0] || null;
}

function appBaseUrl(): string {
  return (
    (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "")
      .trim()
      .replace(/\/$/, "") || "https://app.simplerosterplus.com"
  );
}

function isInternalTestEmail(email: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith("@demo.local") ||
    normalized.endsWith("@funnel-seed.local") ||
    normalized.includes("+test@")
  );
}

async function loadContext(progressId: string): Promise<FollowUpContext> {
  const progress = await prisma.onboardingProgress.findUnique({
    where: { id: progressId },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      contactName: true,
      contactEmail: true,
      businessName: true,
      currentStage: true,
      highestStageReached: true,
      activatedAt: true,
      completedAt: true,
      doNotContact: true,
      needsSupport: true,
      followUpCount: true,
      lastFollowUpAt: true,
      lastActivityAt: true,
      organization: {
        select: {
          isDemo: true,
          isOnboardingSandbox: true,
          suspendedAt: true,
        },
      },
    },
  });
  if (!progress) {
    throw new OnboardingFollowUpError("not_found", "Onboarding lead not found.", 404);
  }
  return { progress, organization: progress.organization };
}

function eligibilityFor(context: FollowUpContext) {
  const p = context.progress;
  return evaluateFollowUpEligibility({
    activatedAt: p.activatedAt,
    completedAt: p.completedAt,
    doNotContact: p.doNotContact,
    needsSupport: p.needsSupport,
    followUpCount: p.followUpCount,
    maxFollowUps: getMaxFollowUps(),
    contactEmail: p.contactEmail,
    isDemo: context.organization?.isDemo,
    isOnboardingSandbox: context.organization?.isOnboardingSandbox,
    suspendedAt: context.organization?.suspendedAt,
    isInternalTest: isInternalTestEmail(p.contactEmail),
    resumedRecently:
      p.lastFollowUpAt != null && p.lastActivityAt > p.lastFollowUpAt,
  });
}

function resolveTemplateKey(
  highestStageReached: string,
  requested?: string | null,
): OnboardingFollowUpTemplateKey {
  if (requested) {
    if (!isOnboardingFollowUpTemplateKey(requested)) {
      throw new OnboardingFollowUpError(
        "invalid_request",
        "Unknown follow-up template.",
        400,
      );
    }
    return requested;
  }
  return recommendedOnboardingFollowUpTemplate(highestStageReached);
}

function renderFor(
  context: FollowUpContext,
  templateKey: OnboardingFollowUpTemplateKey,
): RenderedOnboardingFollowUp {
  const p = context.progress;
  return renderOnboardingFollowUp({
    templateKey,
    firstName: firstName(p.contactName),
    businessName: p.businessName,
    currentStage: p.currentStage,
    continueSetupUrl: `${appBaseUrl()}/setup`,
    supportEmail: process.env.SUPPORT_EMAIL,
  });
}

export async function previewOnboardingFollowUp(
  progressId: string,
  requestedTemplateKey?: string | null,
): Promise<OnboardingFollowUpPreview> {
  const context = await loadContext(progressId);
  const eligibility = eligibilityFor(context);
  const templateKey = resolveTemplateKey(
    context.progress.highestStageReached,
    requestedTemplateKey,
  );
  return {
    progressId,
    to: context.progress.contactEmail,
    eligible: eligibility.eligible,
    ineligibleReason: eligibility.reason ?? null,
    template: renderFor(context, templateKey),
  };
}

function validateRequestKey(requestKey: string): void {
  if (!REQUEST_KEY_RE.test(requestKey)) {
    throw new OnboardingFollowUpError(
      "invalid_request",
      "A valid idempotency key is required.",
      400,
    );
  }
}

function manualSendWindowHours(): number {
  const value = Number(process.env.ONBOARDING_MANUAL_SEND_WINDOW_HOURS ?? "6");
  return Number.isFinite(value) && value > 0 ? value : 6;
}

function operatorHourlyLimit(): number {
  const value = Number(process.env.ONBOARDING_OPERATOR_SENDS_PER_HOUR ?? "30");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 30;
}

async function assertManualSendRateLimit(
  progressId: string,
  initiatedBy: string,
  now: Date,
): Promise<void> {
  const [leadRecent, operatorRecent] = await Promise.all([
    prisma.onboardingFollowUp.count({
      where: {
        onboardingProgressId: progressId,
        status: { in: ["sending", "sent"] },
        createdAt: {
          gte: new Date(now.getTime() - manualSendWindowHours() * HOUR_MS),
        },
      },
    }),
    prisma.onboardingFollowUp.count({
      where: {
        initiatedBy,
        status: { in: ["sending", "sent"] },
        createdAt: { gte: new Date(now.getTime() - HOUR_MS) },
      },
    }),
  ]);
  if (leadRecent > 0) {
    throw new OnboardingFollowUpError(
      "rate_limited",
      `This lead has already received a follow-up within ${manualSendWindowHours()} hours.`,
      429,
    );
  }
  if (operatorRecent >= operatorHourlyLimit()) {
    throw new OnboardingFollowUpError(
      "rate_limited",
      "Operator follow-up send limit reached. Try again later.",
      429,
    );
  }
}

export type FollowUpMutationResult = {
  followUpId: string;
  status: string;
  duplicate: boolean;
  providerMessageId?: string | null;
};

async function existingForKey(
  idempotencyKey: string,
): Promise<FollowUpMutationResult | null> {
  const existing = await prisma.onboardingFollowUp.findUnique({
    where: { idempotencyKey },
    select: { id: true, status: true, providerMessageId: true },
  });
  return existing
    ? {
        followUpId: existing.id,
        status: existing.status,
        duplicate: true,
        providerMessageId: existing.providerMessageId,
      }
    : null;
}

export async function sendManualOnboardingFollowUp(args: {
  progressId: string;
  operatorUserId: string;
  requestKey: string;
  templateKey?: string | null;
  now?: Date;
}): Promise<FollowUpMutationResult> {
  validateRequestKey(args.requestKey);
  const idempotencyKey = `manual:send:${args.progressId}:${args.requestKey}`;
  const duplicate = await existingForKey(idempotencyKey);
  if (duplicate) return duplicate;

  const now = args.now ?? new Date();
  const context = await loadContext(args.progressId);
  const eligibility = eligibilityFor(context);
  if (!eligibility.eligible) {
    throw new OnboardingFollowUpError(
      "not_eligible",
      `Follow-up suppressed: ${eligibility.reason ?? "not eligible"}.`,
      409,
    );
  }
  await assertManualSendRateLimit(
    args.progressId,
    `operator:${args.operatorUserId}`,
    now,
  );

  const templateKey = resolveTemplateKey(
    context.progress.highestStageReached,
    args.templateKey,
  );
  const rendered = renderFor(context, templateKey);
  const recipient = context.progress.contactEmail!;

  let followUp;
  try {
    followUp = await prisma.onboardingFollowUp.create({
      data: {
        userId: context.progress.userId,
        organizationId: context.progress.organizationId,
        onboardingProgressId: args.progressId,
        channel: "email",
        templateKey,
        subject: rendered.subject,
        status: "sending",
        initiatedBy: `operator:${args.operatorUserId}`,
        idempotencyKey,
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await existingForKey(idempotencyKey);
      if (raced) return raced;
    }
    throw error;
  }

  const provider = await sendResendEmailDetailed({
    to: recipient,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    replyTo: process.env.SUPPORT_EMAIL?.trim() || undefined,
    from: process.env.ONBOARDING_FOLLOW_UP_FROM?.trim() || undefined,
  });

  if (!provider.ok) {
    const reason =
      provider.reason === "not_configured"
        ? "Resend is not configured."
        : provider.detail || "Email provider rejected the message.";
    await prisma.$transaction([
      prisma.onboardingFollowUp.update({
        where: { id: followUp.id },
        data: {
          status: "failed",
          failedAt: new Date(),
          failureReason: reason.slice(0, 500),
        },
      }),
      prisma.onboardingProgress.update({
        where: { id: args.progressId },
        data: { followUpStatus: "failed" },
      }),
    ]);
    throw new OnboardingFollowUpError("provider_failed", reason, 502);
  }

  const sentAt = new Date();
  await prisma.$transaction([
    prisma.onboardingFollowUp.update({
      where: { id: followUp.id },
      data: {
        status: "sent",
        sentAt,
        providerMessageId: provider.providerMessageId,
      },
    }),
    prisma.onboardingProgress.update({
      where: { id: args.progressId },
      data: {
        followUpStatus: "sent",
        followUpCount: { increment: 1 },
        lastFollowUpAt: sentAt,
        nextFollowUpAt: null,
      },
    }),
  ]);

  return {
    followUpId: followUp.id,
    status: "sent",
    duplicate: false,
    providerMessageId: provider.providerMessageId,
  };
}

export async function scheduleManualOnboardingFollowUp(args: {
  progressId: string;
  operatorUserId: string;
  requestKey: string;
  scheduledFor: Date;
  templateKey?: string | null;
  now?: Date;
}): Promise<FollowUpMutationResult> {
  validateRequestKey(args.requestKey);
  const idempotencyKey = `manual:schedule:${args.progressId}:${args.requestKey}`;
  const duplicate = await existingForKey(idempotencyKey);
  if (duplicate) return duplicate;

  const now = args.now ?? new Date();
  const earliest = now.getTime() + 5 * 60 * 1000;
  const latest = now.getTime() + 30 * DAY_MS;
  if (
    Number.isNaN(args.scheduledFor.getTime()) ||
    args.scheduledFor.getTime() < earliest ||
    args.scheduledFor.getTime() > latest
  ) {
    throw new OnboardingFollowUpError(
      "invalid_request",
      "Schedule between 5 minutes and 30 days from now.",
      400,
    );
  }

  const context = await loadContext(args.progressId);
  const eligibility = eligibilityFor(context);
  if (!eligibility.eligible) {
    throw new OnboardingFollowUpError(
      "not_eligible",
      `Follow-up suppressed: ${eligibility.reason ?? "not eligible"}.`,
      409,
    );
  }

  const existingPending = await prisma.onboardingFollowUp.findFirst({
    where: {
      onboardingProgressId: args.progressId,
      status: "scheduled",
    },
    select: { id: true },
  });
  if (existingPending) {
    throw new OnboardingFollowUpError(
      "rate_limited",
      "This lead already has a scheduled follow-up.",
      409,
    );
  }

  const templateKey = resolveTemplateKey(
    context.progress.highestStageReached,
    args.templateKey,
  );
  const rendered = renderFor(context, templateKey);

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const followUp = await tx.onboardingFollowUp.create({
        data: {
          userId: context.progress.userId,
          organizationId: context.progress.organizationId,
          onboardingProgressId: args.progressId,
          channel: "email",
          templateKey,
          subject: rendered.subject,
          status: "scheduled",
          scheduledFor: args.scheduledFor,
          initiatedBy: `operator:${args.operatorUserId}`,
          idempotencyKey,
        },
        select: { id: true },
      });
      await tx.onboardingProgress.update({
        where: { id: args.progressId },
        data: {
          followUpStatus: "scheduled",
          nextFollowUpAt: args.scheduledFor,
        },
      });
      return followUp;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await existingForKey(idempotencyKey);
      if (raced) return raced;
    }
    throw error;
  }

  return {
    followUpId: created.id,
    status: "scheduled",
    duplicate: false,
  };
}

const DAY_MS = 24 * HOUR_MS;
