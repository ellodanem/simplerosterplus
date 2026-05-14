import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  DeviceEditForm,
  type DeviceEditValues,
  type LocationOption,
} from "@/app/components/device-edit-form";

export const metadata = {
  title: "Edit device | Simple Roster Plus",
};

type Params = Promise<{ id: string }>;

export default async function EditDevicePage({ params }: { params: Params }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const [device, locations] = await Promise.all([
    prisma.device.findFirst({
      where: { id, organizationId: session.orgId, deletedAt: null },
    }),
    prisma.location.findMany({
      where: { organizationId: session.orgId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  if (!device) notFound();

  const initial: DeviceEditValues = {
    id: device.id,
    name: device.name,
    locationId: device.locationId,
    serialNumber: device.serialNumber ?? "",
    serialLocked: device.lastSeenAt !== null,
    connectionMode: device.connectionMode,
    ipAddress: device.ipAddress ?? "",
    port: device.port == null ? "" : String(device.port),
    timeZone: device.timeZone ?? "",
    notes: device.notes ?? "",
    enabled: device.enabled,
  };

  const reported = {
    model: device.model,
    firmwareVersion: device.firmwareVersion,
    lastSeenAt: device.lastSeenAt,
    lastUserCount: device.lastUserCount,
    lastFingerprintCount: device.lastFingerprintCount,
    lastPunchCount: device.lastPunchCount,
  };

  const locationOptions: LocationOption[] = locations;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            <Link href="/devices" className="hover:underline">
              ← Devices
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            {device.name}
          </h1>
          {device.serialNumber ? (
            <p className="mt-1 font-mono text-xs text-zinc-500">{device.serialNumber}</p>
          ) : null}
        </div>
      </div>

      <DeviceEditForm
        initial={initial}
        locations={locationOptions}
        reported={reported}
      />
    </div>
  );
}
