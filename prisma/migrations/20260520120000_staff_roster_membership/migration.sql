-- Staff roster membership: exclude from planning vs active for current/future weeks.
ALTER TABLE "Staff" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Staff" ADD COLUMN "excludeFromRoster" BOOLEAN NOT NULL DEFAULT false;
