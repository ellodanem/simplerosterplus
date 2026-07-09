-- WhatsApp roster notifications (step 13): org settings, staff opt-in, send log.

ALTER TABLE "Organization" ADD COLUMN "messagingWhatsappEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "whatsappSentMonth" TEXT;
ALTER TABLE "Organization" ADD COLUMN "whatsappSentCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Staff" ADD COLUMN "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Staff" ADD COLUMN "whatsappOptInAt" TIMESTAMP(3);

CREATE TABLE "RosterNotificationLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "rosterWeekId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "rosterWeekPublishAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "externalSid" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterNotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RosterNotificationLog_rosterWeekId_staffId_channel_kind_rosterWeekPublishAt_key" ON "RosterNotificationLog"("rosterWeekId", "staffId", "channel", "kind", "rosterWeekPublishAt");

CREATE INDEX "RosterNotificationLog_organizationId_createdAt_idx" ON "RosterNotificationLog"("organizationId", "createdAt");

ALTER TABLE "RosterNotificationLog" ADD CONSTRAINT "RosterNotificationLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
