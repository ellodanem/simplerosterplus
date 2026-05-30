import { listDevicesForOps } from "@/lib/ops/data";
import { type DeviceStatus } from "@/lib/ops/device-status";
import { StatCard, Card, Pill, type Tone } from "../ops-ui";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<DeviceStatus, Tone> = {
  online: "ok",
  idle: "warn",
  offline: "danger",
  never: "neutral",
};

const STATUS_LABEL: Record<DeviceStatus, string> = {
  online: "Online",
  idle: "Idle",
  offline: "Offline",
  never: "Never connected",
};

export default async function DeviceFleetPage() {
  const { devices, counts } = await listDevicesForOps();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Devices &amp; Ingest Health
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        ZKTeco fleet across every organization. Status mirrors the tenant app: online ≤ 5
        min since last contact, idle ≤ 24 h, otherwise offline.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Devices" value={devices.length} hint="not deleted" />
        <StatCard label="Online" value={counts.online} hint="seen ≤ 5 min" />
        <StatCard label="Idle" value={counts.idle} hint="seen ≤ 24 h" />
        <StatCard
          label="Offline / never"
          value={counts.offline + counts.never}
          hint="needs attention"
        />
      </div>

      <div className="mt-6">
        <Card title={`${devices.length} device${devices.length === 1 ? "" : "s"}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-white text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Connection</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No devices registered on the platform yet.
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{d.name}</div>
                      <div className="text-xs text-zinc-500">
                        {d.serialNumber ? (
                          <span className="font-mono">{d.serialNumber}</span>
                        ) : (
                          "no serial"
                        )}
                        {d.model ? ` · ${d.model}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{d.organizationName}</td>
                    <td className="px-4 py-3 text-zinc-600">{d.locationName}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {d.connectionMode === "adms_push" ? "ADMS push" : "Pull TCP"}
                      {d.ipAddress ? (
                        <span className="block font-mono text-xs text-zinc-400">{d.ipAddress}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      <time dateTime={d.lastSeenAt?.toISOString() ?? ""}>{d.lastSeenLabel}</time>
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Pill>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Punch-ingest time series, clock-drift, and live ingest-error feeds (unmapped users,
        comm-key mismatches) are next on the roadmap — see{" "}
        <span className="font-mono">docs/OPERATOR_CONSOLE.md</span> §3.3.
      </p>
    </div>
  );
}
