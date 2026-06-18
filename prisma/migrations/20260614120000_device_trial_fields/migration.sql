-- Device sync trial columns for free-tier orgs (see docs/PRICING.md).

ALTER TABLE "Organization" ADD COLUMN "deviceTrialStartedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "deviceTrialExpiresAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "deviceTrialExtensionUsed" BOOLEAN NOT NULL DEFAULT false;
