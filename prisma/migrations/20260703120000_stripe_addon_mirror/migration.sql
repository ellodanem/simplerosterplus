-- Stripe add-on mirror columns (step 12)
ALTER TABLE "Organization" ADD COLUMN "addonDeviceQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "addonAdminQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "addonWhatsapp" BOOLEAN NOT NULL DEFAULT false;
