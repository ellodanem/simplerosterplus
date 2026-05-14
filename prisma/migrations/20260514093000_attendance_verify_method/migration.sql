-- Add a `verifyMethod` column to AttendanceLog so device punches can record how the staff
-- verified themselves (fingerprint, face, card, password/PIN, palm, other). Nullable so:
--   * Existing manual punches stay null (no backfill required).
--   * Device punches whose mode we can't recognize land as `other` or `NULL`.

CREATE TYPE "PunchVerifyMethod" AS ENUM (
    'fingerprint',
    'face',
    'card',
    'password',
    'palm',
    'other'
);

ALTER TABLE "AttendanceLog"
    ADD COLUMN "verifyMethod" "PunchVerifyMethod";
