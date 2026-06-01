-- AlterTable
ALTER TABLE "RosterWeek" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RosterWeek_shareToken_key" ON "RosterWeek"("shareToken");
