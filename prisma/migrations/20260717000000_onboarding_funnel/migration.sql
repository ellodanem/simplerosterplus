-- Onboarding funnel: events, progress, follow-ups, notes (docs/ONBOARDING_FUNNEL.md)

CREATE TABLE "OnboardingEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "anonymousSessionId" TEXT,
    "eventName" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "anonymousSessionId" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "businessName" TEXT,
    "currentStage" TEXT NOT NULL,
    "highestStageReached" TEXT NOT NULL,
    "signupStartedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "abandonmentReason" TEXT,
    "needsSupport" BOOLEAN NOT NULL DEFAULT false,
    "supportResolvedAt" TIMESTAMP(3),
    "followUpStatus" TEXT NOT NULL DEFAULT 'none',
    "lastFollowUpAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "signupSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingFollowUp" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "onboardingProgressId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "templateKey" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "providerMessageId" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingNote" (
    "id" TEXT NOT NULL,
    "onboardingProgressId" TEXT NOT NULL,
    "userId" TEXT,
    "authorOperatorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingEvent_idempotencyKey_key" ON "OnboardingEvent"("idempotencyKey");
CREATE INDEX "OnboardingEvent_userId_createdAt_idx" ON "OnboardingEvent"("userId", "createdAt");
CREATE INDEX "OnboardingEvent_organizationId_createdAt_idx" ON "OnboardingEvent"("organizationId", "createdAt");
CREATE INDEX "OnboardingEvent_anonymousSessionId_createdAt_idx" ON "OnboardingEvent"("anonymousSessionId", "createdAt");
CREATE INDEX "OnboardingEvent_eventName_createdAt_idx" ON "OnboardingEvent"("eventName", "createdAt");

CREATE UNIQUE INDEX "OnboardingProgress_userId_key" ON "OnboardingProgress"("userId");
CREATE UNIQUE INDEX "OnboardingProgress_anonymousSessionId_key" ON "OnboardingProgress"("anonymousSessionId");
CREATE INDEX "OnboardingProgress_organizationId_idx" ON "OnboardingProgress"("organizationId");
CREATE INDEX "OnboardingProgress_currentStage_idx" ON "OnboardingProgress"("currentStage");
CREATE INDEX "OnboardingProgress_highestStageReached_idx" ON "OnboardingProgress"("highestStageReached");
CREATE INDEX "OnboardingProgress_lastActivityAt_idx" ON "OnboardingProgress"("lastActivityAt");
CREATE INDEX "OnboardingProgress_nextFollowUpAt_idx" ON "OnboardingProgress"("nextFollowUpAt");
CREATE INDEX "OnboardingProgress_abandonedAt_idx" ON "OnboardingProgress"("abandonedAt");
CREATE INDEX "OnboardingProgress_followUpStatus_idx" ON "OnboardingProgress"("followUpStatus");

CREATE UNIQUE INDEX "OnboardingFollowUp_idempotencyKey_key" ON "OnboardingFollowUp"("idempotencyKey");
CREATE INDEX "OnboardingFollowUp_onboardingProgressId_idx" ON "OnboardingFollowUp"("onboardingProgressId");
CREATE INDEX "OnboardingFollowUp_userId_idx" ON "OnboardingFollowUp"("userId");
CREATE INDEX "OnboardingFollowUp_status_scheduledFor_idx" ON "OnboardingFollowUp"("status", "scheduledFor");

CREATE INDEX "OnboardingNote_onboardingProgressId_createdAt_idx" ON "OnboardingNote"("onboardingProgressId", "createdAt");

ALTER TABLE "OnboardingEvent" ADD CONSTRAINT "OnboardingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingEvent" ADD CONSTRAINT "OnboardingEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OnboardingFollowUp" ADD CONSTRAINT "OnboardingFollowUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingFollowUp" ADD CONSTRAINT "OnboardingFollowUp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingFollowUp" ADD CONSTRAINT "OnboardingFollowUp_onboardingProgressId_fkey" FOREIGN KEY ("onboardingProgressId") REFERENCES "OnboardingProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OnboardingNote" ADD CONSTRAINT "OnboardingNote_onboardingProgressId_fkey" FOREIGN KEY ("onboardingProgressId") REFERENCES "OnboardingProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingNote" ADD CONSTRAINT "OnboardingNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
