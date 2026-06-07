-- CreateTable
CREATE TABLE "TesterFeedback" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'question',
    "message" TEXT NOT NULL,
    "pageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TesterFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TesterFeedback_organizationId_createdAt_idx" ON "TesterFeedback"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "TesterFeedback_status_createdAt_idx" ON "TesterFeedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TesterFeedback_createdAt_idx" ON "TesterFeedback"("createdAt");

-- AddForeignKey
ALTER TABLE "TesterFeedback" ADD CONSTRAINT "TesterFeedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
