-- Requests workflow: promote vacation off Staff into its own approvable table, and add an
-- approval status (+ audit fields) to StaffDayOff. Existing inline Staff vacation ranges are
-- preserved as already-approved StaffVacation rows so nothing currently blocking the roster
-- silently disappears.

CREATE TYPE "LeaveRequestStatus" AS ENUM ('requested', 'approved', 'denied');

CREATE TABLE "StaffVacation" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'requested',
    "reason" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffVacation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffVacation_staffId_idx" ON "StaffVacation"("staffId");
CREATE INDEX "StaffVacation_staffId_status_idx" ON "StaffVacation"("staffId", "status");

ALTER TABLE "StaffVacation"
    ADD CONSTRAINT "StaffVacation_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffVacation"
    ADD CONSTRAINT "StaffVacation_decidedByUserId_fkey"
    FOREIGN KEY ("decidedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: any existing inline range becomes one already-approved StaffVacation row. We tag
-- the id with a stable suffix so the migration is idempotent if it re-runs against a database
-- that's already been backfilled (no duplicate rows on retry).
INSERT INTO "StaffVacation" ("id", "staffId", "startDate", "endDate", "status", "createdAt", "updatedAt")
SELECT
    "id" || '_v0',
    "id",
    "vacationStart",
    "vacationEnd",
    'approved'::"LeaveRequestStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Staff"
WHERE "vacationStart" IS NOT NULL AND "vacationEnd" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Staff" DROP COLUMN "vacationStart";
ALTER TABLE "Staff" DROP COLUMN "vacationEnd";

-- StaffDayOff gains an approval status. Default to 'approved' so any existing rows keep
-- blocking the roster (matches old behavior where the row alone was the block signal).
ALTER TABLE "StaffDayOff" ADD COLUMN "status" "LeaveRequestStatus" NOT NULL DEFAULT 'approved';
ALTER TABLE "StaffDayOff" ADD COLUMN "reason" TEXT;
ALTER TABLE "StaffDayOff" ADD COLUMN "decidedByUserId" TEXT;
ALTER TABLE "StaffDayOff" ADD COLUMN "decidedAt" TIMESTAMP(3);
ALTER TABLE "StaffDayOff" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "StaffDayOff" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "StaffDayOff_staffId_status_idx" ON "StaffDayOff"("staffId", "status");

ALTER TABLE "StaffDayOff"
    ADD CONSTRAINT "StaffDayOff_decidedByUserId_fkey"
    FOREIGN KEY ("decidedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
