import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureDefaultShiftTemplates } from "@/lib/seed-default-shifts";

export type PostProvisionDefaults = {
  organizationName: string;
  timeZone: string;
  locationName: string;
  /** Extra Organization fields to set inside the same update (e.g. clear demo flags). */
  organizationExtra?: Prisma.OrganizationUpdateInput;
};

/**
 * Wipe tenant operational data back to post-provision / pre-wizard state:
 * default location + shift templates, no roles/staff/rosters, no completion settings.
 * Preserves AppUser rows (Clerk login stays intact).
 */
export async function resetTenantToPostProvision(
  organizationId: string,
  defaults: PostProvisionDefaults,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.rosterNotificationLog.deleteMany({ where: { organizationId } });
    await tx.rosterWeek.deleteMany({ where: { organizationId } });
    await tx.attendanceLog.deleteMany({ where: { organizationId } });
    await tx.attendanceDeviceClock.deleteMany({ where: { organizationId } });
    await tx.payPeriod.deleteMany({ where: { organizationId } });
    await tx.device.deleteMany({ where: { organizationId } });
    await tx.publicHoliday.deleteMany({ where: { organizationId } });
    await tx.schedulingRule.deleteMany({ where: { organizationId } });
    await tx.testerFeedback.deleteMany({ where: { organizationId } });
    await tx.staff.deleteMany({ where: { organizationId } });
    await tx.staffRole.deleteMany({ where: { organizationId } });
    await tx.department.deleteMany({ where: { organizationId } });
    await tx.shiftTemplate.deleteMany({ where: { organizationId } });
    await tx.appSetting.deleteMany({ where: { organizationId } });

    await tx.onboardingEvent.deleteMany({ where: { organizationId } });
    // Follow-ups + notes cascade from OnboardingProgress.
    await tx.onboardingProgress.deleteMany({ where: { organizationId } });

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
          name: defaults.locationName,
          timeZone: null,
          sortOrder: 0,
          isDefault: true,
        },
      });
    } else {
      await tx.location.create({
        data: {
          organizationId,
          name: defaults.locationName,
          isDefault: true,
          sortOrder: 0,
        },
      });
    }

    await tx.organization.update({
      where: { id: organizationId },
      data: {
        name: defaults.organizationName,
        timeZone: defaults.timeZone,
        demoExpiresAt: null,
        suspendedAt: null,
        deviceTrialStartedAt: null,
        deviceTrialExpiresAt: null,
        deviceTrialExtensionUsed: false,
        whatsappSentMonth: null,
        whatsappSentCount: 0,
        messagingWhatsappEnabled: false,
        ...defaults.organizationExtra,
      },
    });

    await ensureDefaultShiftTemplates(organizationId, tx);
  });
}
