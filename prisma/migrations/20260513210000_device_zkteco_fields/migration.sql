-- ZKTeco-aware Device fields: serial number routing, connection mode, soft-disable toggle,
-- last-seen tracking for the online/idle/offline pill, and cached sync counters.
-- Additive migration — no existing Device rows lose data; all new columns are nullable
-- except `connectionMode` (defaults to adms_push) and `enabled` (defaults to true).

-- 1) New enum used by Device.connectionMode.
CREATE TYPE "DeviceConnectionMode" AS ENUM ('adms_push', 'pull_tcp');

-- 2) New columns on Device.
ALTER TABLE "Device"
    ADD COLUMN "serialNumber"         TEXT,
    ADD COLUMN "model"                TEXT,
    ADD COLUMN "firmwareVersion"      TEXT,
    ADD COLUMN "connectionMode"       "DeviceConnectionMode" NOT NULL DEFAULT 'adms_push',
    ADD COLUMN "ipAddress"            TEXT,
    ADD COLUMN "port"                 INTEGER,
    ADD COLUMN "commPasswordHash"     TEXT,
    ADD COLUMN "enabled"              BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "lastSeenAt"           TIMESTAMP(3),
    ADD COLUMN "timeZone"             TEXT,
    ADD COLUMN "lastUserCount"        INTEGER,
    ADD COLUMN "lastFingerprintCount" INTEGER,
    ADD COLUMN "lastPunchCount"       INTEGER;

-- 3) One device row per (org, serialNumber). Postgres allows multiple NULLs in a UNIQUE
--    index, which is what we want — devices that haven't reported a serial yet shouldn't
--    collide.
CREATE UNIQUE INDEX "Device_organizationId_serialNumber_key"
    ON "Device"("organizationId", "serialNumber");
