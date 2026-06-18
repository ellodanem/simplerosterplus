import { prisma } from "@/lib/prisma";
import {
  DEVICE_TRIAL_DAYS,
  DEVICE_TRIAL_EXTENSION_DAYS,
  isFreePlan,
} from "@/lib/plans";

export type DeviceTrialStatus = {
  started: boolean;
  active: boolean;
  expired: boolean;
  startedAt: Date | null;
  expiresAt: Date | null;
  extensionUsed: boolean;
  daysRemaining: number | null;
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function computeDeviceTrialStatus(org: {
  plan: string | null;
  isDemo: boolean;
  deviceTrialStartedAt: Date | null;
  deviceTrialExpiresAt: Date | null;
  deviceTrialExtensionUsed: boolean;
}): DeviceTrialStatus {
  const now = Date.now();
  const started = org.deviceTrialStartedAt !== null;
  const expiresAt = org.deviceTrialExpiresAt;
  const expired = started && expiresAt !== null && expiresAt.getTime() <= now;
  const active = started && !expired;

  let daysRemaining: number | null = null;
  if (active && expiresAt) {
    daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now) / (24 * 60 * 60 * 1000)));
  }

  return {
    started,
    active,
    expired,
    startedAt: org.deviceTrialStartedAt,
    expiresAt,
    extensionUsed: org.deviceTrialExtensionUsed,
    daysRemaining,
  };
}

/** Start the org-level device sync trial on first terminal contact (free tier only). */
export async function startDeviceTrialOnFirstConnect(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      plan: true,
      isDemo: true,
      deviceTrialStartedAt: true,
    },
  });
  if (!org || org.isDemo || !isFreePlan(org.plan) || org.deviceTrialStartedAt) {
    return;
  }

  const startedAt = new Date();
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      deviceTrialStartedAt: startedAt,
      deviceTrialExpiresAt: addDays(startedAt, DEVICE_TRIAL_DAYS),
    },
  });
}

/** Whether ADMS ingest should accept new punches for this org. */
export async function isDeviceIngestAllowed(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      plan: true,
      isDemo: true,
      deviceTrialStartedAt: true,
      deviceTrialExpiresAt: true,
      deviceTrialExtensionUsed: true,
    },
  });
  if (!org) return false;
  if (org.isDemo) return true;
  if (!isFreePlan(org.plan)) return true;
  if (!org.deviceTrialStartedAt) return true;

  const status = computeDeviceTrialStatus(org);
  return !status.expired;
}

/** One +30 day extension when org has never published a roster (step 12 Part A hook). */
export async function maybeExtendDeviceTrial(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      plan: true,
      isDemo: true,
      deviceTrialStartedAt: true,
      deviceTrialExpiresAt: true,
      deviceTrialExtensionUsed: true,
    },
  });
  if (!org || org.isDemo || !isFreePlan(org.plan)) return false;
  if (!org.deviceTrialStartedAt || org.deviceTrialExtensionUsed) return false;

  const published = await prisma.rosterWeek.findFirst({
    where: { organizationId, status: "published" },
    select: { id: true },
  });
  if (published) return false;

  const base = org.deviceTrialExpiresAt ?? new Date();
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      deviceTrialExtensionUsed: true,
      deviceTrialExpiresAt: addDays(base, DEVICE_TRIAL_EXTENSION_DAYS),
    },
  });
  return true;
}

export async function getDeviceTrialStatusForOrg(
  organizationId: string,
): Promise<DeviceTrialStatus | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      plan: true,
      isDemo: true,
      deviceTrialStartedAt: true,
      deviceTrialExpiresAt: true,
      deviceTrialExtensionUsed: true,
    },
  });
  if (!org || org.isDemo || !isFreePlan(org.plan)) return null;
  return computeDeviceTrialStatus(org);
}
