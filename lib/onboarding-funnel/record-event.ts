import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  applyMilestoneToProgress,
  applySupportFlag,
  mergeProgressSnapshots,
  parseStageOrDefault,
  type ProgressSnapshot,
} from "@/lib/onboarding-funnel/progress";
import { milestoneIdempotencyKey } from "@/lib/onboarding-funnel/idempotency";
import { sanitizeErrorDetails, sanitizeMetadata } from "@/lib/onboarding-funnel/sanitize";
import {
  isMilestoneStage,
  type OnboardingStage,
} from "@/lib/onboarding-funnel/stages";
import { isUniqueConstraintError } from "@/lib/clerk/prisma-errors";

export const ONBOARDING_ANON_COOKIE = "srp_ob_anon";

type Tx = Prisma.TransactionClient;

export type RecordOnboardingEventInput = {
  eventName: string;
  source: string;
  idempotencyKey: string;
  userId?: string | null;
  organizationId?: string | null;
  anonymousSessionId?: string | null;
  metadata?: Record<string, unknown> | null;
  eventVersion?: number;
  /** Snapshot updates */
  contactName?: string | null;
  contactEmail?: string | null;
  businessName?: string | null;
  signupSource?: string | null;
  /** When true, sets needsSupport on progress. */
  markNeedsSupport?: boolean;
  at?: Date;
};

export type RecordOnboardingEventResult = {
  eventId: string;
  created: boolean;
  progressId: string | null;
};

function rowToSnapshot(row: {
  userId: string | null;
  organizationId: string | null;
  anonymousSessionId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  businessName: string | null;
  currentStage: string;
  highestStageReached: string;
  signupStartedAt: Date | null;
  lastActivityAt: Date;
  activatedAt: Date | null;
  completedAt: Date | null;
  abandonedAt: Date | null;
  abandonmentReason: string | null;
  needsSupport: boolean;
  supportResolvedAt: Date | null;
  signupSource: string | null;
}): ProgressSnapshot {
  return {
    userId: row.userId,
    organizationId: row.organizationId,
    anonymousSessionId: row.anonymousSessionId,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    businessName: row.businessName,
    currentStage: parseStageOrDefault(row.currentStage),
    highestStageReached: parseStageOrDefault(row.highestStageReached),
    signupStartedAt: row.signupStartedAt,
    lastActivityAt: row.lastActivityAt,
    activatedAt: row.activatedAt,
    completedAt: row.completedAt,
    abandonedAt: row.abandonedAt,
    abandonmentReason: row.abandonmentReason,
    needsSupport: row.needsSupport,
    supportResolvedAt: row.supportResolvedAt,
    signupSource: row.signupSource,
  };
}

async function cancelPendingFollowUps(tx: Tx, progressId: string): Promise<void> {
  await tx.onboardingFollowUp.updateMany({
    where: {
      onboardingProgressId: progressId,
      status: { in: ["draft", "scheduled"] },
    },
    data: { status: "cancelled" },
  });
}

async function findProgress(
  tx: Tx,
  subject: {
    userId?: string | null;
    anonymousSessionId?: string | null;
  },
) {
  if (subject.userId) {
    const byUser = await tx.onboardingProgress.findUnique({
      where: { userId: subject.userId },
    });
    if (byUser) return byUser;
  }
  if (subject.anonymousSessionId) {
    return tx.onboardingProgress.findUnique({
      where: { anonymousSessionId: subject.anonymousSessionId },
    });
  }
  return null;
}

async function persistSnapshot(
  tx: Tx,
  existingId: string | null,
  snap: ProgressSnapshot,
  followUpStatus?: string,
): Promise<string> {
  const data = {
    userId: snap.userId,
    organizationId: snap.organizationId,
    anonymousSessionId: snap.anonymousSessionId,
    contactName: snap.contactName,
    contactEmail: snap.contactEmail,
    businessName: snap.businessName,
    currentStage: snap.currentStage,
    highestStageReached: snap.highestStageReached,
    signupStartedAt: snap.signupStartedAt,
    lastActivityAt: snap.lastActivityAt,
    activatedAt: snap.activatedAt,
    completedAt: snap.completedAt,
    abandonedAt: snap.abandonedAt,
    abandonmentReason: snap.abandonmentReason,
    needsSupport: snap.needsSupport,
    supportResolvedAt: snap.supportResolvedAt,
    signupSource: snap.signupSource,
    ...(followUpStatus ? { followUpStatus } : {}),
  };

  if (existingId) {
    await tx.onboardingProgress.update({ where: { id: existingId }, data });
    return existingId;
  }

  const created = await tx.onboardingProgress.create({ data });
  return created.id;
}

/**
 * Idempotent event write + progress upsert in one transaction.
 * Duplicate milestone keys do not re-apply progress mutations.
 */
export async function recordOnboardingEvent(
  input: RecordOnboardingEventInput,
): Promise<RecordOnboardingEventResult> {
  const at = input.at ?? new Date();
  const metadata = sanitizeMetadata(input.metadata ?? undefined);

  try {
    return await prisma.$transaction(async (tx) => {
      let event;
      let created = true;
      try {
        event = await tx.onboardingEvent.create({
          data: {
            eventName: input.eventName,
            eventVersion: input.eventVersion ?? 1,
            source: input.source,
            idempotencyKey: input.idempotencyKey,
            userId: input.userId ?? null,
            organizationId: input.organizationId ?? null,
            anonymousSessionId: input.anonymousSessionId ?? null,
            metadata:
              metadata === undefined
                ? undefined
                : (metadata as Prisma.InputJsonValue),
            createdAt: at,
          },
          select: { id: true },
        });
      } catch (err) {
        if (!isUniqueConstraintError(err)) throw err;
        created = false;
        const existing = await tx.onboardingEvent.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: { id: true, userId: true, anonymousSessionId: true },
        });
        if (!existing) throw err;
        const progress = await findProgress(tx, {
          userId: input.userId ?? existing.userId,
          anonymousSessionId: input.anonymousSessionId ?? existing.anonymousSessionId,
        });
        return {
          eventId: existing.id,
          created: false,
          progressId: progress?.id ?? null,
        };
      }

      // Non-milestone events (e.g. errors): update support / activity only.
      if (!isMilestoneStage(input.eventName)) {
        const progress = await findProgress(tx, {
          userId: input.userId,
          anonymousSessionId: input.anonymousSessionId,
        });
        if (!progress) {
          return { eventId: event.id, created, progressId: null };
        }
        let snap = rowToSnapshot(progress);
        if (input.markNeedsSupport) {
          snap = applySupportFlag(snap, true, at);
        } else {
          snap = {
            ...snap,
            lastActivityAt: at,
            abandonedAt: null,
            abandonmentReason: null,
          };
        }
        const progressId = await persistSnapshot(tx, progress.id, snap);
        await cancelPendingFollowUps(tx, progressId);
        return { eventId: event.id, created, progressId };
      }

      const stage = input.eventName as OnboardingStage;

      // Merge anon → user when both rows exist.
      const byUser =
        input.userId != null
          ? await tx.onboardingProgress.findUnique({ where: { userId: input.userId } })
          : null;
      let byAnon =
        input.anonymousSessionId != null
          ? await tx.onboardingProgress.findUnique({
              where: { anonymousSessionId: input.anonymousSessionId },
            })
          : null;

      if (byUser && byAnon && byUser.id !== byAnon.id) {
        const merged = mergeProgressSnapshots(
          rowToSnapshot(byUser),
          rowToSnapshot(byAnon),
          at,
        );
        await tx.onboardingEvent.updateMany({
          where: { anonymousSessionId: input.anonymousSessionId },
          data: {
            userId: input.userId ?? byUser.userId,
            organizationId: input.organizationId ?? byUser.organizationId,
          },
        });
        await tx.onboardingFollowUp.updateMany({
          where: { onboardingProgressId: byAnon.id },
          data: { onboardingProgressId: byUser.id, status: "cancelled" },
        });
        await tx.onboardingNote.updateMany({
          where: { onboardingProgressId: byAnon.id },
          data: { onboardingProgressId: byUser.id },
        });
        await tx.onboardingProgress.delete({ where: { id: byAnon.id } });
        byAnon = null;
        const applied = applyMilestoneToProgress(merged, {
          stage,
          at,
          organizationId: input.organizationId,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          businessName: input.businessName,
          signupSource: input.signupSource,
        });
        applied.userId = input.userId ?? applied.userId;
        applied.anonymousSessionId = null;
        if (input.markNeedsSupport) {
          Object.assign(applied, applySupportFlag(applied, true, at));
        }
        const progressId = await persistSnapshot(tx, byUser.id, applied);
        await cancelPendingFollowUps(tx, progressId);
        return { eventId: event.id, created, progressId };
      }

      const existing = byUser ?? byAnon;
      const base: ProgressSnapshot = existing
        ? rowToSnapshot(existing)
        : {
            userId: input.userId ?? null,
            organizationId: input.organizationId ?? null,
            anonymousSessionId: input.userId ? null : (input.anonymousSessionId ?? null),
            contactName: input.contactName ?? null,
            contactEmail: input.contactEmail ?? null,
            businessName: input.businessName ?? null,
            currentStage: stage,
            highestStageReached: stage,
            signupStartedAt: stage === "signup_started" ? at : null,
            lastActivityAt: at,
            activatedAt: null,
            completedAt: null,
            abandonedAt: null,
            abandonmentReason: null,
            needsSupport: false,
            supportResolvedAt: null,
            signupSource: input.signupSource ?? null,
          };

      let snap = existing
        ? applyMilestoneToProgress(base, {
            stage,
            at,
            organizationId: input.organizationId,
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            businessName: input.businessName,
            signupSource: input.signupSource,
          })
        : base;

      if (input.userId) {
        snap.userId = input.userId;
        snap.anonymousSessionId = null;
      } else if (input.anonymousSessionId && !snap.userId) {
        snap.anonymousSessionId = input.anonymousSessionId;
      }
      if (input.organizationId) snap.organizationId = input.organizationId;

      if (input.markNeedsSupport) {
        snap = applySupportFlag(snap, true, at);
      }

      const progressId = await persistSnapshot(tx, existing?.id ?? null, snap);
      await cancelPendingFollowUps(tx, progressId);
      return { eventId: event.id, created, progressId };
    });
  } catch (err) {
    console.error("[onboarding-funnel] recordOnboardingEvent failed", {
      eventName: input.eventName,
      err,
    });
    throw err;
  }
}

/** Convenience: record a milestone with the standard stable key. */
export async function recordMilestone(args: {
  stage: OnboardingStage;
  source: string;
  userId?: string | null;
  organizationId?: string | null;
  anonymousSessionId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  businessName?: string | null;
  signupSource?: string | null;
  metadata?: Record<string, unknown> | null;
  at?: Date;
}): Promise<RecordOnboardingEventResult> {
  return recordOnboardingEvent({
    eventName: args.stage,
    source: args.source,
    idempotencyKey: milestoneIdempotencyKey(args.stage, args),
    userId: args.userId,
    organizationId: args.organizationId,
    anonymousSessionId: args.anonymousSessionId,
    contactName: args.contactName,
    contactEmail: args.contactEmail,
    businessName: args.businessName,
    signupSource: args.signupSource,
    metadata: args.metadata,
    at: args.at,
  });
}

/** Record a sanitized product error and flag needsSupport. */
export async function recordOnboardingError(args: {
  category: string;
  source: string;
  requestId: string;
  userId?: string | null;
  organizationId?: string | null;
  anonymousSessionId?: string | null;
  message?: string | null;
  step?: string | null;
  traceId?: string | null;
}): Promise<RecordOnboardingEventResult> {
  const { errorIdempotencyKey } = await import("@/lib/onboarding-funnel/idempotency");
  return recordOnboardingEvent({
    eventName: `error:${args.category}`,
    source: args.source,
    idempotencyKey: errorIdempotencyKey(args.category, args.requestId),
    userId: args.userId,
    organizationId: args.organizationId,
    anonymousSessionId: args.anonymousSessionId,
    markNeedsSupport: true,
    metadata: sanitizeErrorDetails({
      category: args.category,
      message: args.message,
      step: args.step,
      requestId: args.requestId,
      traceId: args.traceId,
    }),
  });
}

/**
 * Link an anonymous signup session to a provisioned AppUser.
 * Safe to call repeatedly.
 */
export async function linkAnonymousOnboardingSession(args: {
  anonymousSessionId: string;
  userId: string;
  organizationId: string;
  contactName?: string | null;
  contactEmail?: string | null;
  businessName?: string | null;
}): Promise<void> {
  const anon = args.anonymousSessionId.trim();
  if (!anon) return;

  await prisma.$transaction(async (tx) => {
    await tx.onboardingEvent.updateMany({
      where: { anonymousSessionId: anon },
      data: {
        userId: args.userId,
        organizationId: args.organizationId,
      },
    });

    const byUser = await tx.onboardingProgress.findUnique({
      where: { userId: args.userId },
    });
    const byAnon = await tx.onboardingProgress.findUnique({
      where: { anonymousSessionId: anon },
    });

    if (!byAnon && !byUser) return;

    if (byUser && byAnon && byUser.id !== byAnon.id) {
      const merged = mergeProgressSnapshots(
        rowToSnapshot(byUser),
        rowToSnapshot(byAnon),
        new Date(),
      );
      merged.userId = args.userId;
      merged.organizationId = args.organizationId;
      merged.anonymousSessionId = null;
      merged.contactName = args.contactName ?? merged.contactName;
      merged.contactEmail = args.contactEmail ?? merged.contactEmail;
      merged.businessName = args.businessName ?? merged.businessName;
      await tx.onboardingFollowUp.updateMany({
        where: { onboardingProgressId: byAnon.id },
        data: { onboardingProgressId: byUser.id, status: "cancelled" },
      });
      await tx.onboardingNote.updateMany({
        where: { onboardingProgressId: byAnon.id },
        data: { onboardingProgressId: byUser.id },
      });
      await tx.onboardingProgress.delete({ where: { id: byAnon.id } });
      await persistSnapshot(tx, byUser.id, merged);
      await cancelPendingFollowUps(tx, byUser.id);
      return;
    }

    const row = byUser ?? byAnon!;
    await tx.onboardingProgress.update({
      where: { id: row.id },
      data: {
        userId: args.userId,
        organizationId: args.organizationId,
        anonymousSessionId: null,
        contactName: args.contactName ?? row.contactName,
        contactEmail: args.contactEmail ?? row.contactEmail,
        businessName: args.businessName ?? row.businessName,
        abandonedAt: null,
        abandonmentReason: null,
        lastActivityAt: new Date(),
      },
    });
    await cancelPendingFollowUps(tx, row.id);
  });
}

/** Fire-and-forget wrapper so domain routes never fail on analytics. */
export function trackOnboardingMilestone(
  args: Parameters<typeof recordMilestone>[0],
): void {
  void recordMilestone(args).catch((err) => {
    console.error("[onboarding-funnel] milestone track failed", {
      stage: args.stage,
      err,
    });
  });
}

export function trackOnboardingError(
  args: Parameters<typeof recordOnboardingError>[0],
): void {
  void recordOnboardingError(args).catch((err) => {
    console.error("[onboarding-funnel] error track failed", {
      category: args.category,
      err,
    });
  });
}
