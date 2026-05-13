-- Unique deviceUserId per organization. Postgres treats NULLs as distinct by
-- default, so staff without a device user id are still allowed (and may
-- coexist), while any non-null deviceUserId must be unique within the org.
CREATE UNIQUE INDEX "Staff_organizationId_deviceUserId_key" ON "Staff"("organizationId", "deviceUserId");
