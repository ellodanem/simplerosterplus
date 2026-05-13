-- Optional profile fields for Staff. All are nullable so existing rows are
-- unaffected and no backfill is required.
ALTER TABLE "Staff"
    ADD COLUMN "dateOfBirth"   DATE,
    ADD COLUMN "startDate"     DATE,
    ADD COLUMN "contactNumber" TEXT;
