-- Make public holidays location-scoped and add a default country/subdivision calendar per
-- location so holidays can be synced automatically without hardcoding them in the UI.

ALTER TABLE "Location"
    ADD COLUMN "holidayCountryCode" TEXT,
    ADD COLUMN "holidaySubdivisionCode" TEXT;

ALTER TABLE "PublicHoliday"
    ADD COLUMN "locationId" TEXT,
    ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';

UPDATE "PublicHoliday" h
SET "locationId" = (
    SELECT l."id"
    FROM "Location" l
    WHERE l."organizationId" = h."organizationId"
      AND l."isDefault" = true
    ORDER BY l."sortOrder" ASC
    LIMIT 1
)
WHERE h."locationId" IS NULL;

ALTER TABLE "PublicHoliday"
    ALTER COLUMN "locationId" SET NOT NULL;

DROP INDEX IF EXISTS "PublicHoliday_organizationId_date_key";
CREATE UNIQUE INDEX "PublicHoliday_locationId_date_key" ON "PublicHoliday"("locationId", "date");
CREATE INDEX "PublicHoliday_locationId_idx" ON "PublicHoliday"("locationId");

ALTER TABLE "PublicHoliday"
    ADD CONSTRAINT "PublicHoliday_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
