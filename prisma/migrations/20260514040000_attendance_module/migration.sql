-- Attendance module (v1, manual punches only). Adds:
--   * AttendanceLog       — one row per clock event, with original-time audit on edits.
--   * AttendanceDayOverride — supervisor "manual present / manual absent" per (staff, date).
--
-- No data backfill: existing organizations simply start empty here. The presence helper
-- (lib/attendance-policy.ts) treats "no punches + no override" as the natural baseline.

CREATE TYPE "PunchType"   AS ENUM ('in', 'out');
CREATE TYPE "PunchSource" AS ENUM ('manual', 'device_adms', 'device_pull');

CREATE TABLE "AttendanceLog" (
    "id"                 TEXT NOT NULL,
    "organizationId"     TEXT NOT NULL,
    "locationId"         TEXT NOT NULL,
    "staffId"            TEXT,
    "deviceId"           TEXT,
    "punchAt"            TIMESTAMP(3) NOT NULL,
    "punchType"          "PunchType" NOT NULL,
    "source"             "PunchSource" NOT NULL DEFAULT 'manual',
    "note"               TEXT,
    "originalPunchAt"    TIMESTAMP(3),
    "createdByUserId"    TEXT,
    "correctedByUserId"  TEXT,
    "correctedAt"        TIMESTAMP(3),
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AttendanceLog_locationId_punchAt_idx"     ON "AttendanceLog"("locationId", "punchAt");
CREATE INDEX "AttendanceLog_staffId_punchAt_idx"        ON "AttendanceLog"("staffId", "punchAt");
CREATE INDEX "AttendanceLog_organizationId_punchAt_idx" ON "AttendanceLog"("organizationId", "punchAt");
CREATE INDEX "AttendanceLog_deviceId_idx"               ON "AttendanceLog"("deviceId");

ALTER TABLE "AttendanceLog"
    ADD CONSTRAINT "AttendanceLog_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceLog"
    ADD CONSTRAINT "AttendanceLog_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceLog"
    ADD CONSTRAINT "AttendanceLog_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AttendanceLog"
    ADD CONSTRAINT "AttendanceLog_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AttendanceLog"
    ADD CONSTRAINT "AttendanceLog_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AttendanceLog"
    ADD CONSTRAINT "AttendanceLog_correctedByUserId_fkey"
    FOREIGN KEY ("correctedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "AttendanceOverrideStatus" AS ENUM ('present', 'absent');

CREATE TABLE "AttendanceDayOverride" (
    "id"              TEXT NOT NULL,
    "staffId"         TEXT NOT NULL,
    "date"            DATE NOT NULL,
    "status"          "AttendanceOverrideStatus" NOT NULL,
    "lateReason"      TEXT,
    "note"            TEXT,
    "decidedByUserId" TEXT,
    "decidedAt"       TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttendanceDayOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceDayOverride_staffId_date_key" ON "AttendanceDayOverride"("staffId", "date");
CREATE INDEX        "AttendanceDayOverride_staffId_idx"      ON "AttendanceDayOverride"("staffId");
CREATE INDEX        "AttendanceDayOverride_staffId_date_idx" ON "AttendanceDayOverride"("staffId", "date");

ALTER TABLE "AttendanceDayOverride"
    ADD CONSTRAINT "AttendanceDayOverride_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceDayOverride"
    ADD CONSTRAINT "AttendanceDayOverride_decidedByUserId_fkey"
    FOREIGN KEY ("decidedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
