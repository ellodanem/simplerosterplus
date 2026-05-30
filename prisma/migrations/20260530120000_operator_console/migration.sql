-- Operator console (platform admin plane): org billing/lifecycle mirror + operator identity/audit.
-- See docs/OPERATOR_CONSOLE.md.

-- CreateEnum
CREATE TYPE "OperatorRole" AS ENUM ('readonly', 'support', 'billing', 'superadmin');

-- AlterTable: Organization billing & lifecycle mirror columns (all nullable / defaulted, additive)
ALTER TABLE "Organization" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "plan" TEXT;
ALTER TABLE "Organization" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "Organization" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "demoExpiresAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "suspendedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");

-- CreateTable: OperatorUser (internal allow-list, separate from tenant AppUser)
CREATE TABLE "OperatorUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "clerkUserId" TEXT,
    "role" "OperatorRole" NOT NULL DEFAULT 'readonly',
    "disabledAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperatorUser_email_key" ON "OperatorUser"("email");
CREATE UNIQUE INDEX "OperatorUser_clerkUserId_key" ON "OperatorUser"("clerkUserId");

-- CreateTable: OperatorAuditLog (append-only operator action trail)
CREATE TABLE "OperatorAuditLog" (
    "id" TEXT NOT NULL,
    "operatorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "organizationId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperatorAuditLog_operatorUserId_idx" ON "OperatorAuditLog"("operatorUserId");
CREATE INDEX "OperatorAuditLog_organizationId_idx" ON "OperatorAuditLog"("organizationId");
CREATE INDEX "OperatorAuditLog_action_createdAt_idx" ON "OperatorAuditLog"("action", "createdAt");
CREATE INDEX "OperatorAuditLog_createdAt_idx" ON "OperatorAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "OperatorAuditLog" ADD CONSTRAINT "OperatorAuditLog_operatorUserId_fkey" FOREIGN KEY ("operatorUserId") REFERENCES "OperatorUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
