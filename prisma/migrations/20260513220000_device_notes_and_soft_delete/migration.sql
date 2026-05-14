-- Operator notes + soft delete for Device.
-- Additive migration: existing rows get NULL for both new columns and remain visible
-- (deletedAt IS NULL means "live"). The new (organizationId, deletedAt) index keeps the
-- list query ("show all live devices for my org") fast.

ALTER TABLE "Device"
    ADD COLUMN "notes"     TEXT,
    ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Device_organizationId_deletedAt_idx"
    ON "Device"("organizationId", "deletedAt");
