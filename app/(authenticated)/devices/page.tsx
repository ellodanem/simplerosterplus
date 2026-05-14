import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { DeviceEnabledToggle } from "@/app/components/device-enabled-toggle";
import { AddDeviceButton } from "@/app/components/add-device-drawer";

export const metadata = {
  title: "Devices | Simple Roster Plus",
};

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const IDLE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

type DeviceStatus = "online" | "idle" | "offline" | "never";

function deriveStatus(lastSeenAt: Date | null, enabled: boolean, now: number): DeviceStatus {
  if (!enabled) return "offline";
  if (!lastSeenAt) return "never";
  const age = now - lastSeenAt.getTime();
  if (age <= ONLINE_THRESHOLD_MS) return "online";
  if (age <= IDLE_THRESHOLD_MS) return "idle";
  return "offline";
}

function relativeTime(d: Date | null, now: number): string {
  if (!d) return "Never";
  const diffSec = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

const STATUS_PILL: Record<DeviceStatus, { label: string; className: string }> = {
  online: { label: "Online", className: "bg-emerald-100 text-emerald-800" },
  idle: { label: "Idle", className: "bg-amber-100 text-amber-800" },
  offline: { label: "Offline", className: "bg-rose-100 text-rose-800" },
  never: { label: "Never connected", className: "bg-zinc-200 text-zinc-700" },
};

export default async function DevicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [devices, locations] = await Promise.all([
    prisma.device.findMany({
      where: { organizationId: session.orgId, deletedAt: null },
      orderBy: [{ name: "asc" }],
      include: { location: { select: { name: true } } },
    }),
    prisma.location.findMany({
      where: { organizationId: session.orgId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const now = Date.now();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Devices</h1>
          <p className="mt-1 text-sm text-zinc-600">
            ZKTeco terminals registered to your organization. Punches arrive here over ADMS push or
            scheduled pull and are matched to staff by device user ID.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Filter — comes with multi-location device search"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-500 disabled:cursor-not-allowed"
          >
            Filter
          </button>
          <AddDeviceButton locations={locations} />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">Connected device status</h2>
          <span className="text-xs text-zinc-500">
            {devices.length} {devices.length === 1 ? "device" : "devices"}
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-white text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Last active</th>
              <th className="px-4 py-3">Serial</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Enabled</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {devices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                  No devices yet. Once the Add device flow lands, paired ZKTeco terminals will
                  appear here with their last-seen status.
                </td>
              </tr>
            ) : (
              devices.map((d) => {
                const status = deriveStatus(d.lastSeenAt, d.enabled, now);
                const pill = STATUS_PILL[status];
                return (
                  <tr key={d.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">
                        <Link href={`/devices/${d.id}`} className="hover:underline">
                          {d.name}
                        </Link>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {d.model ?? "Unknown model"}
                        {d.firmwareVersion ? ` · fw ${d.firmwareVersion}` : ""}
                        {" · "}
                        {d.connectionMode === "adms_push" ? "ADMS push" : "Pull TCP"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{d.location.name}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      <time dateTime={d.lastSeenAt?.toISOString() ?? ""}>
                        {relativeTime(d.lastSeenAt, now)}
                      </time>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {d.serialNumber ? (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700">
                          {d.serialNumber}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pill.className}`}
                      >
                        {pill.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeviceEnabledToggle
                        id={d.id}
                        enabled={d.enabled}
                        deviceName={d.name}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/devices/${d.id}`}
                        className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Add device, edit, the enabled toggle, and soft-delete are live. The actual ADMS endpoint
        and pull-sync that update the Last active column are the next pass.
      </p>
    </div>
  );
}
