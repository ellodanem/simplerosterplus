import { prisma } from "@/lib/prisma";
import { resetTenantToPostProvision } from "@/lib/ops/reset-tenant-data";

/** Fresh-signup look for the business step of the setup wizard. */
export const RECORDING_SANDBOX_ORG_NAME = "My organization";
export const RECORDING_SANDBOX_TIMEZONE = "UTC";
export const RECORDING_SANDBOX_LOCATION_NAME = "Main";

/**
 * Wipe a recording sandbox back to post-provision / pre-wizard state.
 * AppUser + Clerk identity are preserved — sign in normally and run setup → publish.
 */
export async function resetRecordingSandbox(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, isRecordingSandbox: true },
  });
  if (!org?.isRecordingSandbox) {
    throw new Error("Organization is not a recording sandbox");
  }

  await resetTenantToPostProvision(organizationId, {
    organizationName: RECORDING_SANDBOX_ORG_NAME,
    timeZone: RECORDING_SANDBOX_TIMEZONE,
    locationName: RECORDING_SANDBOX_LOCATION_NAME,
    organizationExtra: {
      isDemo: false,
      isOnboardingSandbox: false,
    },
  });
}

export async function findRecordingSandboxOrgs(): Promise<
  Array<{ id: string; name: string }>
> {
  return prisma.organization.findMany({
    where: { isRecordingSandbox: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
}

export async function setRecordingSandboxFlag(
  organizationId: string,
  enabled: boolean,
): Promise<{ id: string; name: string; isRecordingSandbox: boolean }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      isDemo: true,
      isOnboardingSandbox: true,
      isRecordingSandbox: true,
    },
  });
  if (!org) {
    throw new Error("Organization not found");
  }
  if (enabled && org.isOnboardingSandbox) {
    throw new Error("Onboarding sandbox cannot also be a recording sandbox");
  }
  if (enabled && org.isDemo) {
    throw new Error("Demo orgs cannot be recording sandboxes — convert or use a real Free org");
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      isRecordingSandbox: enabled,
      ...(enabled ? { isDemo: false } : {}),
    },
    select: { id: true, name: true, isRecordingSandbox: true },
  });
  return updated;
}
