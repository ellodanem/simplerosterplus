-- Soft shift preference requests (Requests inbox). Approve records preference only —
-- does not assign or clear roster cells.

CREATE TABLE "StaffShiftRequest" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shiftTemplateId" TEXT NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'requested',
    "reason" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffShiftRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffShiftRequest_staffId_date_shiftTemplateId_key" ON "StaffShiftRequest"("staffId", "date", "shiftTemplateId");
CREATE INDEX "StaffShiftRequest_staffId_idx" ON "StaffShiftRequest"("staffId");
CREATE INDEX "StaffShiftRequest_staffId_status_idx" ON "StaffShiftRequest"("staffId", "status");
CREATE INDEX "StaffShiftRequest_shiftTemplateId_idx" ON "StaffShiftRequest"("shiftTemplateId");

ALTER TABLE "StaffShiftRequest"
    ADD CONSTRAINT "StaffShiftRequest_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffShiftRequest"
    ADD CONSTRAINT "StaffShiftRequest_shiftTemplateId_fkey"
    FOREIGN KEY ("shiftTemplateId") REFERENCES "ShiftTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StaffShiftRequest"
    ADD CONSTRAINT "StaffShiftRequest_decidedByUserId_fkey"
    FOREIGN KEY ("decidedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
