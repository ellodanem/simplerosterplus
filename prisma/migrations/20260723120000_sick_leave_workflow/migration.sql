-- AlterTable
ALTER TABLE "StaffSickLeave" ADD COLUMN     "reason" TEXT,
ADD COLUMN     "decidedByUserId" TEXT,
ADD COLUMN     "decidedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "StaffSickLeave_staffId_status_idx" ON "StaffSickLeave"("staffId", "status");

-- AddForeignKey
ALTER TABLE "StaffSickLeave" ADD CONSTRAINT "StaffSickLeave_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
