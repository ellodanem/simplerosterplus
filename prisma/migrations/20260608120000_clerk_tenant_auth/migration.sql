-- CreateEnum
CREATE TYPE "AppUserRole" AS ENUM ('owner', 'admin', 'member');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "clerkOrgId" TEXT;

-- AlterTable
ALTER TABLE "AppUser" ADD COLUMN "clerkUserId" TEXT,
ADD COLUMN "role" "AppUserRole" NOT NULL DEFAULT 'member',
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_clerkOrgId_key" ON "Organization"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_clerkUserId_key" ON "AppUser"("clerkUserId");
