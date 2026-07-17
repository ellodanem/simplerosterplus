/**
 * Cross-tenant onboarding funnel queries for the operator console.
 * See docs/ONBOARDING_FUNNEL.md.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  evaluateAbandonment,
  getAbandonmentRulesFromEnv,
} from "@/lib/onboarding-funnel/abandonment";
import {
  hasReachedStage,
  ONBOARDING_STAGES,
  type OnboardingStage,
} from "@/lib/onboarding-funnel/stages";
import { recommendFollowUpTemplate } from "@/lib/onboarding-funnel/eligibility";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DatePreset = "today" | "7d" | "30d" | "90d" | "custom";

export type OnboardingDateRange = {
  preset: DatePreset;
  from: Date;
  to: Date;
};

export function resolveOnboardingDateRange(opts: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
  now?: Date;
}): OnboardingDateRange {
  const now = opts.now ?? new Date();
  const to = endOfUtcDay(now);
  const preset = (opts.range ?? "30d") as DatePreset;

  if (preset === "custom" && opts.from && opts.to) {
    const from = startOfUtcDay(new Date(opts.from));
    const customTo = endOfUtcDay(new Date(opts.to));
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(customTo.getTime()) && from <= customTo) {
      return { preset: "custom", from, to: customTo };
    }
  }

  switch (preset) {
    case "today":
      return { preset: "today", from: startOfUtcDay(now), to };
    case "7d":
      return { preset: "7d", from: new Date(to.getTime() - 7 * DAY_MS), to };
    case "90d":
      return { preset: "90d", from: new Date(to.getTime() - 90 * DAY_MS), to };
    case "custom":
    case "30d":
    default:
      return { preset: "30d", from: new Date(to.getTime() - 30 * DAY_MS), to };
  }
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

const FUNNEL_SUMMARY_STAGES: OnboardingStage[] = [
  "signup_started",
  "account_created",
  "workspace_created",
  "employees_added",
  "first_roster_created",
  "first_roster_published",
  "onboarding_completed",
];

export const STAGE_LABELS: Record<OnboardingStage, string> = {
  signup_started: "Signup started",
  account_created: "Account created",
  email_verified: "Email verified",
  workspace_created: "Workspace created",
  business_details_completed: "Business details",
  employees_added: "Employees added",
  first_roster_started: "First roster started",
  first_roster_created: "First roster created",
  first_roster_published: "First roster published",
  attendance_setup_started: "Attendance setup started",
  attendance_device_connected: "Attendance device connected",
  onboarding_completed: "Onboarding completed",
};

export type FunnelStageRow = {
  stage: OnboardingStage;
  label: string;
  reached: number;
  conversionFromPrevious: number | null;
  conversionFromSignup: number | null;
  medianHoursToReach: number | null;
  stalledAtStage: number;
};

export type OnboardingFunnelSummary = {
  range: OnboardingDateRange;
  signupStarted: number;
  accountCreated: number;
  workspaceCreated: number;
  employeesAdded: number;
  firstRosterCreated: number;
  firstRosterPublished: number;
  onboardingCompleted: number;
  currentlyStalled: number;
  followUpsDue: number;
  followUpsSent: number;
  /** Activated / signup started in range. */
  activationRate: number | null;
  stages: FunnelStageRow[];
};

function progressScope(range: OnboardingDateRange): Prisma.OnboardingProgressWhereInput {
  return {
    AND: [
      {
        OR: [
          { signupStartedAt: { gte: range.from, lte: range.to } },
          { signupStartedAt: null, createdAt: { gte: range.from, lte: range.to } },
        ],
      },
      {
        OR: [
          { organizationId: null },
          {
            organization: {
              isDemo: false,
              isOnboardingSandbox: false,
            },
          },
        ],
      },
    ],
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function isStalledLive(
  row: {
    highestStageReached: string;
    currentStage: string;
    signupStartedAt: Date | null;
    lastActivityAt: Date;
    activatedAt: Date | null;
    completedAt: Date | null;
    needsSupport: boolean;
    doNotContact: boolean;
    abandonedAt: Date | null;
  },
  now: Date,
): boolean {
  if (row.activatedAt) return false;
  if (row.abandonedAt) return true;
  const verdict = evaluateAbandonment(
    {
      highestStageReached: row.highestStageReached,
      currentStage: row.currentStage,
      signupStartedAt: row.signupStartedAt,
      lastActivityAt: row.lastActivityAt,
      activatedAt: row.activatedAt,
      completedAt: row.completedAt,
      needsSupport: row.needsSupport,
      doNotContact: row.doNotContact,
    },
    now,
    getAbandonmentRulesFromEnv(),
  );
  return verdict.abandoned;
}

export async function getOnboardingFunnelSummary(
  range: OnboardingDateRange,
  now = new Date(),
): Promise<OnboardingFunnelSummary> {
  const rows = await prisma.onboardingProgress.findMany({
    where: progressScope(range),
    select: {
      id: true,
      userId: true,
      anonymousSessionId: true,
      highestStageReached: true,
      currentStage: true,
      signupStartedAt: true,
      createdAt: true,
      lastActivityAt: true,
      activatedAt: true,
      completedAt: true,
      abandonedAt: true,
      needsSupport: true,
      doNotContact: true,
      followUpStatus: true,
      followUpCount: true,
      nextFollowUpAt: true,
    },
  });

  const countReached = (stage: OnboardingStage) =>
    rows.filter((r) => hasReachedStage(r.highestStageReached, stage)).length;

  const signupStarted = Math.max(countReached("signup_started"), rows.length);
  const accountCreated = countReached("account_created");
  const workspaceCreated = countReached("workspace_created");
  const employeesAdded = countReached("employees_added");
  const firstRosterCreated = countReached("first_roster_created");
  const firstRosterPublished = countReached("first_roster_published");
  const onboardingCompleted = countReached("onboarding_completed");

  const currentlyStalled = rows.filter((r) => isStalledLive(r, now)).length;
  const followUpsDue = rows.filter(
    (r) =>
      r.followUpStatus === "due" ||
      r.followUpStatus === "recommended" ||
      (r.nextFollowUpAt != null && r.nextFollowUpAt <= now && !r.doNotContact && !r.activatedAt),
  ).length;
  const followUpsSent = rows.filter(
    (r) => r.followUpCount > 0 || r.followUpStatus === "sent",
  ).length;

  const activationRate =
    signupStarted > 0 ? firstRosterPublished / signupStarted : null;

  const eventSubjects = rows.flatMap((p) => {
    const parts: Prisma.OnboardingEventWhereInput[] = [];
    if (p.userId) parts.push({ userId: p.userId });
    if (p.anonymousSessionId) parts.push({ anonymousSessionId: p.anonymousSessionId });
    return parts;
  });

  const events =
    eventSubjects.length > 0
      ? await prisma.onboardingEvent.findMany({
          where: {
            OR: eventSubjects,
            eventName: { in: [...ONBOARDING_STAGES] },
          },
          select: {
            userId: true,
            anonymousSessionId: true,
            eventName: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        })
      : [];

  const signupBySubject = new Map<string, Date>();
  for (const p of rows) {
    const key = p.userId ? `u:${p.userId}` : `a:${p.anonymousSessionId}`;
    signupBySubject.set(key, p.signupStartedAt ?? p.createdAt);
  }

  const hoursByStage = new Map<OnboardingStage, number[]>();
  for (const stage of ONBOARDING_STAGES) hoursByStage.set(stage, []);

  const firstEventBySubjectStage = new Map<string, Date>();
  for (const ev of events) {
    const subject = ev.userId ? `u:${ev.userId}` : `a:${ev.anonymousSessionId}`;
    const k = `${subject}|${ev.eventName}`;
    if (!firstEventBySubjectStage.has(k)) {
      firstEventBySubjectStage.set(k, ev.createdAt);
      const signupAt = signupBySubject.get(subject);
      if (signupAt && ONBOARDING_STAGES.includes(ev.eventName as OnboardingStage)) {
        const hours = (ev.createdAt.getTime() - signupAt.getTime()) / (60 * 60 * 1000);
        if (hours >= 0) {
          hoursByStage.get(ev.eventName as OnboardingStage)!.push(hours);
        }
      }
    }
  }

  const stages: FunnelStageRow[] = FUNNEL_SUMMARY_STAGES.map((stage, index) => {
    const reached = countReached(stage);
    const prev = index === 0 ? null : FUNNEL_SUMMARY_STAGES[index - 1]!;
    const prevCount = prev ? countReached(prev) : null;
    return {
      stage,
      label: STAGE_LABELS[stage],
      reached,
      conversionFromPrevious:
        prevCount != null && prevCount > 0 ? reached / prevCount : null,
      conversionFromSignup: signupStarted > 0 ? reached / signupStarted : null,
      medianHoursToReach: median(hoursByStage.get(stage) ?? []),
      stalledAtStage: rows.filter(
        (r) => isStalledLive(r, now) && r.currentStage === stage,
      ).length,
    };
  });

  return {
    range,
    signupStarted,
    accountCreated,
    workspaceCreated,
    employeesAdded,
    firstRosterCreated,
    firstRosterPublished,
    onboardingCompleted,
    currentlyStalled,
    followUpsDue,
    followUpsSent,
    activationRate,
    stages,
  };
}

export type LeadListFilters = {
  range: OnboardingDateRange;
  q?: string;
  stage?: string;
  activated?: "yes" | "no";
  stalled?: "yes" | "no";
  followUp?: "due" | "sent" | "failed" | "none";
  doNotContact?: "yes" | "no";
  source?: string;
  page?: number;
  pageSize?: number;
};

export type OnboardingLeadRow = {
  id: string;
  contactName: string | null;
  contactEmail: string | null;
  businessName: string | null;
  organizationId: string | null;
  userId: string | null;
  currentStage: string;
  highestStageReached: string;
  signupStartedAt: Date | null;
  lastActivityAt: Date;
  stalledMs: number | null;
  followUpStatus: string;
  followUpCount: number;
  activated: boolean;
  needsSupport: boolean;
  doNotContact: boolean;
  signupSource: string | null;
  recommendedTemplate: string;
};

function stalledMsFor(
  row: {
    abandonedAt: Date | null;
    lastActivityAt: Date;
    activatedAt: Date | null;
  },
  stalled: boolean,
  now: Date,
): number | null {
  if (!stalled || row.activatedAt) return null;
  const anchor = row.abandonedAt ?? row.lastActivityAt;
  return Math.max(0, now.getTime() - anchor.getTime());
}

export async function listOnboardingLeads(
  filters: LeadListFilters,
  now = new Date(),
): Promise<{ rows: OnboardingLeadRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));

  const where: Prisma.OnboardingProgressWhereInput = {
    AND: [progressScope(filters.range)],
  };
  const and = where.AND as Prisma.OnboardingProgressWhereInput[];

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    and.push({
      OR: [
        { contactName: { contains: q, mode: "insensitive" } },
        { contactEmail: { contains: q, mode: "insensitive" } },
        { businessName: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (filters.stage) {
    and.push({ currentStage: filters.stage });
  }
  if (filters.activated === "yes") and.push({ activatedAt: { not: null } });
  if (filters.activated === "no") and.push({ activatedAt: null });
  if (filters.doNotContact === "yes") and.push({ doNotContact: true });
  if (filters.doNotContact === "no") and.push({ doNotContact: false });
  if (filters.source?.trim()) {
    and.push({ signupSource: filters.source.trim() });
  }
  if (filters.followUp === "due") {
    and.push({
      OR: [
        { followUpStatus: { in: ["due", "recommended"] } },
        { nextFollowUpAt: { lte: now } },
      ],
      doNotContact: false,
      activatedAt: null,
    });
  }
  if (filters.followUp === "sent") {
    and.push({ OR: [{ followUpStatus: "sent" }, { followUpCount: { gt: 0 } }] });
  }
  if (filters.followUp === "failed") {
    and.push({ followUpStatus: "failed" });
  }
  if (filters.followUp === "none") {
    and.push({ followUpStatus: "none", followUpCount: 0 });
  }

  // Fetch a bounded window then sort in memory for stalled / due priority.
  const candidates = await prisma.onboardingProgress.findMany({
    where,
    take: 500,
    orderBy: [{ createdAt: "desc" }],
  });

  let mapped: OnboardingLeadRow[] = candidates.map((r) => {
    const stalled = isStalledLive(r, now);
    return {
      id: r.id,
      contactName: r.contactName,
      contactEmail: r.contactEmail,
      businessName: r.businessName,
      organizationId: r.organizationId,
      userId: r.userId,
      currentStage: r.currentStage,
      highestStageReached: r.highestStageReached,
      signupStartedAt: r.signupStartedAt,
      lastActivityAt: r.lastActivityAt,
      stalledMs: stalledMsFor(r, stalled, now),
      followUpStatus: r.followUpStatus,
      followUpCount: r.followUpCount,
      activated: r.activatedAt != null,
      needsSupport: r.needsSupport,
      doNotContact: r.doNotContact,
      signupSource: r.signupSource,
      recommendedTemplate: recommendFollowUpTemplate(r.highestStageReached),
    };
  });

  if (filters.stalled === "yes") {
    mapped = mapped.filter((r) => r.stalledMs != null);
  } else if (filters.stalled === "no") {
    mapped = mapped.filter((r) => r.stalledMs == null);
  }

  const followUpDueRank = (r: OnboardingLeadRow) => {
    if (r.doNotContact || r.activated) return 1;
    if (
      r.followUpStatus === "due" ||
      r.followUpStatus === "recommended" ||
      r.stalledMs != null
    ) {
      return 0;
    }
    return 1;
  };

  mapped.sort((a, b) => {
    const due = followUpDueRank(a) - followUpDueRank(b);
    if (due !== 0) return due;
    const stall = (b.stalledMs ?? -1) - (a.stalledMs ?? -1);
    if (stall !== 0) return stall;
    const aSignup = a.signupStartedAt?.getTime() ?? 0;
    const bSignup = b.signupStartedAt?.getTime() ?? 0;
    return bSignup - aSignup;
  });

  const total = mapped.length;
  const start = (page - 1) * pageSize;
  const rows = mapped.slice(start, start + pageSize);
  return { rows, total, page, pageSize };
}

export type OnboardingLeadDetail = {
  progress: {
    id: string;
    userId: string | null;
    organizationId: string | null;
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
    followUpStatus: string;
    followUpCount: number;
    lastFollowUpAt: Date | null;
    nextFollowUpAt: Date | null;
    doNotContact: boolean;
    signupSource: string | null;
    createdAt: Date;
  };
  organization: {
    id: string;
    name: string;
    suspendedAt: Date | null;
    isDemo: boolean;
  } | null;
  events: Array<{
    id: string;
    eventName: string;
    source: string;
    createdAt: Date;
    metadata: unknown;
  }>;
  followUps: Array<{
    id: string;
    templateKey: string;
    subject: string;
    status: string;
    scheduledFor: Date | null;
    sentAt: Date | null;
    failedAt: Date | null;
    failureReason: string | null;
    initiatedBy: string;
    createdAt: Date;
  }>;
  notes: Array<{
    id: string;
    body: string;
    authorOperatorUserId: string | null;
    createdAt: Date;
  }>;
  resumeSetupUrl: string;
  recommendedTemplate: string;
  stalled: boolean;
};

export async function getOnboardingLeadDetail(
  progressId: string,
  now = new Date(),
): Promise<OnboardingLeadDetail | null> {
  const progress = await prisma.onboardingProgress.findUnique({
    where: { id: progressId },
  });
  if (!progress) return null;

  const [organization, events, followUps, notes] = await Promise.all([
    progress.organizationId
      ? prisma.organization.findUnique({
          where: { id: progress.organizationId },
          select: { id: true, name: true, suspendedAt: true, isDemo: true },
        })
      : Promise.resolve(null),
    prisma.onboardingEvent.findMany({
      where: {
        OR: [
          ...(progress.userId ? [{ userId: progress.userId }] : []),
          ...(progress.anonymousSessionId
            ? [{ anonymousSessionId: progress.anonymousSessionId }]
            : []),
          ...(progress.organizationId
            ? [{ organizationId: progress.organizationId }]
            : []),
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        eventName: true,
        source: true,
        createdAt: true,
        metadata: true,
      },
    }),
    prisma.onboardingFollowUp.findMany({
      where: { onboardingProgressId: progress.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.onboardingNote.findMany({
      where: { onboardingProgressId: progress.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const appBase =
    (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") ||
    "https://app.simplerosterplus.com";

  const stalled = isStalledLive(progress, now);

  return {
    progress: {
      id: progress.id,
      userId: progress.userId,
      organizationId: progress.organizationId,
      contactName: progress.contactName,
      contactEmail: progress.contactEmail,
      businessName: progress.businessName,
      currentStage: progress.currentStage,
      highestStageReached: progress.highestStageReached,
      signupStartedAt: progress.signupStartedAt,
      lastActivityAt: progress.lastActivityAt,
      activatedAt: progress.activatedAt,
      completedAt: progress.completedAt,
      abandonedAt: progress.abandonedAt,
      abandonmentReason: progress.abandonmentReason,
      needsSupport: progress.needsSupport,
      supportResolvedAt: progress.supportResolvedAt,
      followUpStatus: progress.followUpStatus,
      followUpCount: progress.followUpCount,
      lastFollowUpAt: progress.lastFollowUpAt,
      nextFollowUpAt: progress.nextFollowUpAt,
      doNotContact: progress.doNotContact,
      signupSource: progress.signupSource,
      createdAt: progress.createdAt,
    },
    organization,
    events,
    followUps,
    notes,
    resumeSetupUrl: `${appBase}/setup`,
    recommendedTemplate: recommendFollowUpTemplate(progress.highestStageReached),
    stalled,
  };
}

/** Pure helper exported for tests — conversion math. */
export function computeConversionRate(reached: number, base: number): number | null {
  if (base <= 0) return null;
  return reached / base;
}

export function formatStalledDuration(ms: number | null): string {
  if (ms == null) return "—";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function formatPercent(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 1000) / 10}%`;
}

export function formatMedianHours(hours: number | null): string {
  if (hours == null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
}
