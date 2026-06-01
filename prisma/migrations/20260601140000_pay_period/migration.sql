-- Extract Pay Period: saved reports + punch filing metadata

CREATE TABLE "PayPeriod" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reportDate" DATE NOT NULL,
    "entityName" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "rowsBeforeLastEdit" JSONB,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayPeriod_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AttendanceLog" ADD COLUMN "extractedAt" TIMESTAMP(3),
ADD COLUMN "extractedPayPeriodId" TEXT;

CREATE INDEX "AttendanceLog_locationId_extractedAt_idx" ON "AttendanceLog"("locationId", "extractedAt");
CREATE INDEX "AttendanceLog_extractedPayPeriodId_idx" ON "AttendanceLog"("extractedPayPeriodId");
CREATE INDEX "PayPeriod_locationId_endDate_createdAt_idx" ON "PayPeriod"("locationId", "endDate" DESC, "createdAt" DESC);
CREATE INDEX "PayPeriod_organizationId_idx" ON "PayPeriod"("organizationId");

ALTER TABLE "PayPeriod" ADD CONSTRAINT "PayPeriod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayPeriod" ADD CONSTRAINT "PayPeriod_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_extractedPayPeriodId_fkey" FOREIGN KEY ("extractedPayPeriodId") REFERENCES "PayPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
