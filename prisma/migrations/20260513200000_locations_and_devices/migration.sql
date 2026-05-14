-- Locations and Devices: introduce per-organization Location and per-Location Device tables,
-- backfill a default Location for every existing Organization, and move Staff and RosterWeek
-- under a required locationId. Staff deviceUserId uniqueness moves from per-org to per-location.

-- 1) Location
CREATE TABLE "Location" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "timeZone"       TEXT,
    "isDefault"      BOOLEAN NOT NULL DEFAULT false,
    "sortOrder"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE INDEX        "Location_organizationId_idx"      ON "Location"("organizationId");
CREATE UNIQUE INDEX "Location_organizationId_name_key" ON "Location"("organizationId", "name");

ALTER TABLE "Location"
    ADD CONSTRAINT "Location_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Device
CREATE TABLE "Device" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId"     TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "identifier"     TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE INDEX        "Device_organizationId_idx"   ON "Device"("organizationId");
CREATE INDEX        "Device_locationId_idx"       ON "Device"("locationId");
CREATE UNIQUE INDEX "Device_locationId_name_key"  ON "Device"("locationId", "name");

ALTER TABLE "Device"
    ADD CONSTRAINT "Device_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Device"
    ADD CONSTRAINT "Device_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) One default "Main" Location per existing Organization. Deterministic ID derived from
--    the org id so re-runs are safe and the row is easy to identify in logs.
INSERT INTO "Location" ("id", "organizationId", "name", "isDefault", "sortOrder", "updatedAt")
SELECT
    o."id" || '_main',
    o."id",
    'Main',
    true,
    0,
    CURRENT_TIMESTAMP
FROM "Organization" o
WHERE NOT EXISTS (
    SELECT 1 FROM "Location" l WHERE l."organizationId" = o."id"
);

-- 4) Add nullable locationId columns on Staff and RosterWeek so we can backfill.
ALTER TABLE "Staff"      ADD COLUMN "locationId" TEXT;
ALTER TABLE "RosterWeek" ADD COLUMN "locationId" TEXT;

UPDATE "Staff" s
SET "locationId" = (
    SELECT l."id" FROM "Location" l
    WHERE l."organizationId" = s."organizationId" AND l."isDefault" = true
    LIMIT 1
)
WHERE s."locationId" IS NULL;

UPDATE "RosterWeek" r
SET "locationId" = (
    SELECT l."id" FROM "Location" l
    WHERE l."organizationId" = r."organizationId" AND l."isDefault" = true
    LIMIT 1
)
WHERE r."locationId" IS NULL;

-- 5) Lock columns down and add foreign keys.
ALTER TABLE "Staff"      ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "RosterWeek" ALTER COLUMN "locationId" SET NOT NULL;

ALTER TABLE "Staff"
    ADD CONSTRAINT "Staff_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RosterWeek"
    ADD CONSTRAINT "RosterWeek_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Staff_locationId_idx"      ON "Staff"("locationId");
CREATE INDEX "RosterWeek_locationId_idx" ON "RosterWeek"("locationId");

-- 6) Replace the Staff deviceUserId uniqueness key (per-org -> per-location).
DROP INDEX IF EXISTS "Staff_organizationId_deviceUserId_key";
CREATE UNIQUE INDEX "Staff_locationId_deviceUserId_key"
    ON "Staff"("locationId", "deviceUserId");

-- 7) Replace the RosterWeek week-start uniqueness key (per-org -> per-location).
DROP INDEX IF EXISTS "RosterWeek_organizationId_weekStart_key";
CREATE UNIQUE INDEX "RosterWeek_locationId_weekStart_key"
    ON "RosterWeek"("locationId", "weekStart");
