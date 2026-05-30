import Link from "next/link";
import { listDevicesForOps, getIngestHealth } from "@/lib/ops/data";
import { type DeviceStatus } from "@/lib/ops/device-status";
import { StatCard, Card, Pill, Sparkline, formatDateTime, type Tone } from "../ops-ui";

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

function formatDrift(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export default async function DeviceFleetPage() {
  const [{ devices, counts }, ingest] = await Promise.all([
    listDevicesForOps(),
    getIngestHealth(),
  ]);

  const total24h = ingest.punchSeries24h.reduce((s, p) => s + p.count, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Devices &amp; Ingest Health
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        ZKTeco fleet and ADMS ingest pipeline across every organization. Device status
        mirrors the tenant app: online ≤ 5 min since last contact, idle ≤ 24 h, else offline.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard label="Devices" value={devices.length} hint="not deleted" />
        <StatCard label="Online" value={counts.online} hint="seen ≤ 5 min" />
        <StatCard
          label="Offline / never"
          value={counts.offline + counts.never}
          hint="needs attention"
        />
        <StatCard label="Punches today" value={ingest.punchesToday.toLocaleString()} hint="device-sourced" />
        <StatCard
          label="Avg clock drift"
          value={formatDrift(ingest.avgClockDriftMs)}
          hint={`${ingest.calibratedDevices}/${ingest.trackedSerials} calibrated`}
        />
        <StatCard
          label="Stalled devices"
          value={ingest.stalledDevices}
          hint="ADMS, silent > 1 h"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Punch ingest volume (24 h)">
            <div className="p-4">
              <Sparkline points={ingest.punchSeries24h.map((p) => p.count)} />
              <p className="mt-2 text-xs text-zinc-500">
                {total24h.toLocaleString()} device punches ingested in the last 24 hours
              </p>
            </div>
          </Card>
        </div>

        <Card title="Ingest errors — unmapped punches">
          <ul className="divide-y divide-zinc-100">
            {ingest.unmapped.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">
                No unmapped device punches. Every punch is matched to a staff member.
              </li>
            ) : (
              ingest.unmapped.map((u) => (
                <li key={`${u.organizationId}-${u.deviceUserId}`} className="px-4 py-3">
                  <Link
                    href={`/ops/organizations/${u.organizationId}`}
                    className="flex items-center justify-between gap-2 hover:underline"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-zinc-900">
                        {u.organizationName}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        device user{" "}
                        <span className="font-mono">{u.deviceUserId ?? "—"}</span> ·{" "}
                        {formatDateTime(u.lastPunchAt)}
                      </span>
                    </span>
                    <Pill tone="warn">{u.count}</Pill>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Card>
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
        Clock drift is learned per ZKTeco serial from ADMS punches. Comm-key mismatch and
        parse-error feeds land with richer ingest event logging — see{" "}
        <span className="font-mono">docs/OPERATOR_CONSOLE.md</span> §3.3.
      </p>
    </div>
  );
}
