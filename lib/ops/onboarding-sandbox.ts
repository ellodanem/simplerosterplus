import { prisma } from "@/lib/prisma";
import {
  ONBOARDING_SANDBOX_ADMIN_EMAIL,
  ONBOARDING_SANDBOX_LOCATION_NAME,
  ONBOARDING_SANDBOX_ORG_NAME,
  ONBOARDING_SANDBOX_TIMEZONE,
} from "@/lib/ops/onboarding-sandbox-constants";
import {
  generateTempPassword,
  provisionOrganization,
} from "@/lib/ops/provision-org";
import { resetTenantToPostProvision } from "@/lib/ops/reset-tenant-data";

export {
  ONBOARDING_SANDBOX_ORG_NAME,
  ONBOARDING_SANDBOX_ADMIN_EMAIL,
  ONBOARDING_SANDBOX_TIMEZONE,
  ONBOARDING_SANDBOX_LOCATION_NAME,
} from "@/lib/ops/onboarding-sandbox-constants";

export type OnboardingSandboxOrg = {
  id: string;
  name: string;
  created: boolean;
};

/** Find the dedicated sandbox org, or provision one for the first time. */
export async function ensureOnboardingSandboxOrg(): Promise<OnboardingSandboxOrg> {
  const existing = await prisma.organization.findFirst({
    where: { isOnboardingSandbox: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (existing) {
    return { id: existing.id, name: existing.name, created: false };
  }

  const created = await provisionOrganization({
    name: ONBOARDING_SANDBOX_ORG_NAME,
    timeZone: ONBOARDING_SANDBOX_TIMEZONE,
    adminEmail: ONBOARDING_SANDBOX_ADMIN_EMAIL,
    adminPassword: generateTempPassword(),
  });

  await prisma.organization.update({
    where: { id: created.organizationId },
    data: {
      isOnboardingSandbox: true,
      isDemo: false,
      plan: "comp",
      subscriptionStatus: null,
    },
  });

  return {
    id: created.organizationId,
    name: created.organizationName,
    created: true,
  };
}

/**
 * Wipe sandbox tenant data back to post-provision / pre-wizard state:
 * default location + shift templates, no roles/staff, no completion settings.
 */
export async function resetOnboardingSandbox(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, isOnboardingSandbox: true },
  });
  if (!org?.isOnboardingSandbox) {
    throw new Error("Organization is not an onboarding sandbox");
  }

  await resetTenantToPostProvision(organizationId, {
    organizationName: ONBOARDING_SANDBOX_ORG_NAME,
    timeZone: ONBOARDING_SANDBOX_TIMEZONE,
    locationName: ONBOARDING_SANDBOX_LOCATION_NAME,
    organizationExtra: {
      isDemo: false,
    },
  });
}
