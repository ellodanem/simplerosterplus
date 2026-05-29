-- ADMS ingest: device clock calibration + attendance log ingest metadata

CREATE TABLE "AttendanceDeviceClock" (
    "organizationId" TEXT NOT NULL,
    "deviceSerial" TEXT NOT NULL,
    "offsetMs" INTEGER NOT NULL DEFAULT 0,
    "isCalibrated" BOOLEAN NOT NULL DEFAULT false,
    "pendingDeltasJson" TEXT NOT NULL DEFAULT '[]',
    "calibrationSamples" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceDeviceClock_pkey" PRIMARY KEY ("organizationId","deviceSerial")
);

ALTER TABLE "AttendanceLog" ADD COLUMN "deviceUserId" TEXT;
ALTER TABLE "AttendanceLog" ADD COLUMN "deviceRawTimestamp" TEXT;
ALTER TABLE "AttendanceLog" ADD COLUMN "ingestReceivedAt" TIMESTAMP(3);
ALTER TABLE "AttendanceLog" ADD COLUMN "clockOffsetMsApplied" INTEGER;
ALTER TABLE "AttendanceLog" ADD COLUMN "clockNormalizeReason" TEXT;

CREATE INDEX "AttendanceLog_deviceUserId_punchAt_idx" ON "AttendanceLog"("deviceUserId", "punchAt");

CREATE INDEX "AttendanceDeviceClock_organizationId_idx" ON "AttendanceDeviceClock"("organizationId");

ALTER TABLE "AttendanceDeviceClock" ADD CONSTRAINT "AttendanceDeviceClock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
