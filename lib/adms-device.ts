import { prisma } from "@/lib/prisma";
import { startDeviceTrialOnFirstConnect } from "@/lib/device-trial";

export type AdmsResolvedDevice = {
  id: string;
  organizationId: string;
  locationId: string;
  serialNumber: string;
  timeZone: string | null;
  organization: { timeZone: string };
  location: { timeZone: string | null };
};

/**
 * Resolve an ADMS device by serial (`SN` query param). Returns null when unknown, disabled, or soft-deleted.
 * P0 assumption: one deployment URL maps to one primary org; if multiple orgs share a serial, the first match wins and a warning is logged.
 */
export async function resolveAdmsDeviceBySerial(
  serial: string,
): Promise<AdmsResolvedDevice | null> {
  const sn = serial.trim();
  if (!sn || sn === "unknown") return null;

  const rows = await prisma.device.findMany({
    where: {
      serialNumber: sn,
      deletedAt: null,
      enabled: true,
    },
    select: {
      id: true,
      organizationId: true,
      locationId: true,
      serialNumber: true,
      timeZone: true,
      organization: { select: { timeZone: true } },
      location: { select: { timeZone: true } },
    },
    orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
    take: 2,
  });

  if (rows.length === 0) return null;
  if (rows.length > 1) {
    console.warn(
      `[ADMS] serial ${sn} matches ${rows.length} enabled devices across organizations; using ${rows[0]!.organizationId} (most recent lastSeenAt / createdAt). P0: prefer one org per deployment URL.`,
    );
  }

  const row = rows[0]!;
  if (!row.serialNumber) return null;

  return {
    id: row.id,
    organizationId: row.organizationId,
    locationId: row.locationId,
    serialNumber: row.serialNumber,
    timeZone: row.timeZone,
    organization: row.organization,
    location: row.location,
  };
}

/** Device → location → organization IANA timezone for ATTLOG parse and calendar-day bucketing. */
export function resolveDeviceTimeZone(device: AdmsResolvedDevice): string {
  return device.timeZone ?? device.location.timeZone ?? device.organization.timeZone;
}

export async function touchDeviceLastSeen(deviceId: string): Promise<void> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { organizationId: true },
  });
  if (!device) return;

  await startDeviceTrialOnFirstConnect(device.organizationId);

  await prisma.device.update({
    where: { id: deviceId },
    data: { lastSeenAt: new Date() },
  });
}
