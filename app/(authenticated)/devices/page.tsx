import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { admsDeviceHint } from "@/lib/adms-health";
import { DeviceEnabledToggle } from "@/app/components/device-enabled-toggle";
import { AddDeviceButton } from "@/app/components/add-device-drawer";
import { DeviceStatusCells } from "@/app/components/device-status-cells";
import { UnmappedDevicePunchesPanel } from "@/app/components/unmapped-device-punches-panel";
import { redirectToSetupIfIncomplete } from "@/lib/setup-guard";
import {
  getOrgPublicAppUrlOverride,
  publicAppUrlHostnameHyphenWarning,
} from "@/lib/public-app-url-settings";
import { resolvePublicAppUrlForOrg } from "@/lib/public-url";
import { PublicAppUrlSettingsButton } from "@/app/components/public-app-url-settings";
import {
  getStaffOptionsForUnmappedMapping,
  listUnmappedDeviceUsers,
} from "@/lib/unmapped-device-punches";

export const metadata = {
  title: "Devices | Simple Roster Plus",
};

export default async function DevicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await redirectToSetupIfIncomplete({ organizationId: session.orgId, nextPath: "/devices" });

  const [devices, locations, punchCounts24h, unmappedRows] = await Promise.all([
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
    prisma.attendanceLog.groupBy({
      by: ["deviceId"],
      where: {
        organizationId: session.orgId,
        source: "device_adms",
        deviceId: { not: null },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      _count: { _all: true },
    }),
    listUnmappedDeviceUsers(session.orgId),
  ]);

  const unmappedLocationIds = [...new Set(unmappedRows.map((r) => r.locationId))];
  const staffByLocationId = await getStaffOptionsForUnmappedMapping(
    session.orgId,
    unmappedLocationIds,
  );

  const punchCountByDeviceId = new Map(
    punchCounts24h
      .filter((row) => row.deviceId)
      .map((row) => [row.deviceId!, row._count._all]),
  );

  const requestHeaders = await headers();
  const [orgPublicAppUrl, resolvedPublic] = await Promise.all([
    getOrgPublicAppUrlOverride(session.orgId),
    resolvePublicAppUrlForOrg(session.orgId, { headers: requestHeaders }),
  ]);
  const publicBaseUrl = resolvedPublic.url;
  const hostnameHyphenWarning = publicAppUrlHostnameHyphenWarning(publicBaseUrl);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Devices</h1>
          <p className="mt-1 text-sm text-zinc-600">
            ZKTeco terminals registered to your organization. Punches arrive via ADMS push when the
            terminal reaches <span className="font-mono">/iclock/*</span>;{" "}
            <span className="font-medium">Last active</span> updates on each successful ingest.
            Match staff using the same device user ID as on the terminal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled
            title="Filter — comes with multi-location device search"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-500 disabled:cursor-not-allowed"
          >
            Filter
          </button>
          <PublicAppUrlSettingsButton
            initialOrgPublicAppUrl={orgPublicAppUrl}
            resolvedPublicAppUrl={publicBaseUrl}
            resolvedSource={resolvedPublic.source}
            hostnameHyphenWarning={hostnameHyphenWarning}
          />
          <AddDeviceButton locations={locations} publicBaseUrl={publicBaseUrl} />
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
              <th className="px-4 py-3">Punches (24h)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Serial</th>
              <th className="px-4 py-3 text-right">Enabled</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {devices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-500">
                  No devices yet. Use <span className="font-medium">Add device</span> to register a
                  terminal; punches appear here once ADMS push reaches the server.
                </td>
              </tr>
            ) : (
              devices.map((d) => {
                const punchCount24h = punchCountByDeviceId.get(d.id) ?? 0;
                const hint = admsDeviceHint(
                  d.lastSeenAt,
                  punchCount24h,
                  d.enabled,
                  d.connectionMode,
                );
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
                    <DeviceStatusCells
                      lastSeenAt={d.lastSeenAt?.toISOString() ?? null}
                      enabled={d.enabled}
                    />
                    <td className="px-4 py-3 text-zinc-600">
                      <span className="tabular-nums">{punchCount24h}</span>
                      {hint ? (
                        <span
                          className="ml-1.5 text-xs text-amber-700"
                          title={hint}
                        >
                          ATTLOG?
                        </span>
                      ) : null}
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

      <UnmappedDevicePunchesPanel
        initialRows={unmappedRows}
        initialStaffByLocationId={staffByLocationId}
      />

      {hostnameHyphenWarning ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {hostnameHyphenWarning}
        </p>
      ) : null}

      <p className="mt-4 text-xs text-zinc-500">
        ADMS push updates <span className="font-medium">Last active</span> when a registered,
        enabled terminal contacts <span className="font-mono">/iclock/*</span>.{" "}
        <span className="font-medium">Punches (24h)</span> counts ADMS rows ingested in the last
        24 hours. If a device shows recent contact but zero punches, hover{" "}
        <span className="font-medium">ATTLOG?</span> for the usual fix (enable attendance upload,
        not OPERLOG-only). Full diagnostics:{" "}
        <span className="font-mono">GET /api/attendance/adms-health</span>.
      </p>
    </div>
  );
}
