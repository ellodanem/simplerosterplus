-- CreateTable
CREATE TABLE "MarketingInquiry" (
    "id" TEXT NOT NULL,
    "intent" TEXT NOT NULL DEFAULT 'early_access',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "business" TEXT,
    "phone" TEXT,
    "staffCount" TEXT,
    "hasZkteco" TEXT,
    "message" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingInquiry_email_createdAt_idx" ON "MarketingInquiry"("email", "createdAt");

-- CreateIndex
CREATE INDEX "MarketingInquiry_createdAt_idx" ON "MarketingInquiry"("createdAt");
