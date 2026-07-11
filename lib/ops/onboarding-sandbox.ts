import { prisma } from "@/lib/prisma";
import { ensureDefaultShiftTemplates } from "@/lib/seed-default-shifts";
import {
  generateTempPassword,
  provisionOrganization,
} from "@/lib/ops/provision-org";

export const ONBOARDING_SANDBOX_ORG_NAME = "Onboarding Sandbox";
export const ONBOARDING_SANDBOX_ADMIN_EMAIL = "onboarding-sandbox@ops.local";
export const ONBOARDING_SANDBOX_TIMEZONE = "UTC";
export const ONBOARDING_SANDBOX_LOCATION_NAME = "Main";

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

  await prisma.$transaction(async (tx) => {
    await tx.rosterNotificationLog.deleteMany({ where: { organizationId } });
    await tx.rosterWeek.deleteMany({ where: { organizationId } });
    await tx.attendanceLog.deleteMany({ where: { organizationId } });
    await tx.attendanceDeviceClock.deleteMany({ where: { organizationId } });
    await tx.payPeriod.deleteMany({ where: { organizationId } });
    await tx.device.deleteMany({ where: { organizationId } });
    await tx.publicHoliday.deleteMany({ where: { organizationId } });
    await tx.schedulingRule.deleteMany({ where: { organizationId } });
    await tx.staff.deleteMany({ where: { organizationId } });
    await tx.staffRole.deleteMany({ where: { organizationId } });
    await tx.department.deleteMany({ where: { organizationId } });
    await tx.shiftTemplate.deleteMany({ where: { organizationId } });
    await tx.appSetting.deleteMany({ where: { organizationId } });

    await tx.location.deleteMany({
      where: { organizationId, isDefault: false },
    });

    const defaultLocation = await tx.location.findFirst({
      where: { organizationId, isDefault: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });

    if (defaultLocation) {
      await tx.location.update({
        where: { id: defaultLocation.id },
        data: {
          name: ONBOARDING_SANDBOX_LOCATION_NAME,
          timeZone: null,
          sortOrder: 0,
          isDefault: true,
        },
      });
    } else {
      await tx.location.create({
        data: {
          organizationId,
          name: ONBOARDING_SANDBOX_LOCATION_NAME,
          isDefault: true,
          sortOrder: 0,
        },
      });
    }

    await tx.organization.update({
      where: { id: organizationId },
      data: {
        name: ONBOARDING_SANDBOX_ORG_NAME,
        timeZone: ONBOARDING_SANDBOX_TIMEZONE,
        isDemo: false,
        demoExpiresAt: null,
        suspendedAt: null,
      },
    });

    await ensureDefaultShiftTemplates(organizationId, tx);
  });
}
