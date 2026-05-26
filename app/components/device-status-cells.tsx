"use client";

import { Fragment, useState } from "react";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const IDLE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

type DeviceStatus = "online" | "idle" | "offline" | "never";

const STATUS_PILL: Record<DeviceStatus, { label: string; className: string }> = {
  online: { label: "Online", className: "bg-emerald-100 text-emerald-800" },
  idle: { label: "Idle", className: "bg-amber-100 text-amber-800" },
  offline: { label: "Offline", className: "bg-rose-100 text-rose-800" },
  never: { label: "Never connected", className: "bg-zinc-200 text-zinc-700" },
};

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

export function DeviceStatusCells({
  lastSeenAt,
  enabled,
}: {
  lastSeenAt: string | null;
  enabled: boolean;
}) {
  const [now] = useState(() => Date.now());
  const lastSeenDate = lastSeenAt ? new Date(lastSeenAt) : null;
  const status = deriveStatus(lastSeenDate, enabled, now);
  const pill = STATUS_PILL[status];

  return (
    <Fragment>
      <td className="px-4 py-3 text-zinc-600">
        <time dateTime={lastSeenAt ?? ""}>{relativeTime(lastSeenDate, now)}</time>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pill.className}`}>
          {pill.label}
        </span>
      </td>
    </Fragment>
  );
}
