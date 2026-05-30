// Server-side device status derivation for the operator fleet view. Mirrors the thresholds
// used by the tenant app's client `DeviceStatusCells` (app/components/device-status-cells.tsx)
// so "online / idle / offline / never" means the same thing on both planes.

export type DeviceStatus = "online" | "idle" | "offline" | "never";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const IDLE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function deriveDeviceStatus(
  lastSeenAt: Date | null,
  enabled: boolean,
  now: number = Date.now(),
): DeviceStatus {
  if (!enabled) return "offline";
  if (!lastSeenAt) return "never";
  const age = now - lastSeenAt.getTime();
  if (age <= ONLINE_THRESHOLD_MS) return "online";
  if (age <= IDLE_THRESHOLD_MS) return "idle";
  return "offline";
}

export function relativeTime(d: Date | null, now: number = Date.now()): string {
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
