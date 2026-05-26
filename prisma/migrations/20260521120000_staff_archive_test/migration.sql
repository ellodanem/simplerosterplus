-- Archive timestamp and immutable test-user flag.
ALTER TABLE "Staff" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Staff" ADD COLUMN "isTestUser" BOOLEAN NOT NULL DEFAULT false;
