"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  UnmappedDeviceUserRow,
  UnmappedStaffOption,
} from "@/lib/unmapped-device-punches";

type Props = {
  initialRows: UnmappedDeviceUserRow[];
  initialStaffByLocationId: Record<string, UnmappedStaffOption[]>;
};

export function UnmappedDevicePunchesPanel({
  initialRows,
  initialStaffByLocationId,
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [staffByLocationId, setStaffByLocationId] = useState(initialStaffByLocationId);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rowKey = (r: UnmappedDeviceUserRow) => `${r.locationId}__${r.deviceUserId}`;

  const refresh = useCallback(async () => {
    const res = await fetch("/api/attendance/device/unmapped");
    const body = (await res.json().catch(() => ({}))) as {
      rows?: UnmappedDeviceUserRow[];
      staffByLocationId?: Record<string, UnmappedStaffOption[]>;
      error?: string;
    };
    if (!res.ok) throw new Error(body.error || "Could not refresh unmapped list");
    setRows(body.rows ?? []);
    setStaffByLocationId(body.staffByLocationId ?? {});
  }, []);

  function mapRow(row: UnmappedDeviceUserRow) {
    const key = rowKey(row);
    const staffId = selection[key];
    if (!staffId) {
      setError("Choose a staff member to map this device user ID.");
      return;
    }

    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fetch("/api/attendance/device/map-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceUserId: row.deviceUserId, staffId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        backfilledCount?: number;
      };
      if (!res.ok) {
        setError(body.error ?? "Could not map device user ID");
        return;
      }
      const n = body.backfilledCount ?? 0;
      setNotice(
        `Mapped device user ID ${row.deviceUserId}. Linked ${n} past punch${n === 1 ? "" : "es"}.`,
      );
      setSelection((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      try {
        await refresh();
      } catch {
        router.refresh();
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60">
      <div className="border-b border-amber-200 bg-amber-100/80 px-4 py-3">
        <h2 className="text-sm font-semibold text-amber-950">Unmapped device user IDs</h2>
        <p className="mt-0.5 text-xs text-amber-900/80">
          Terminal punches arrived without a matching staff profile. Map each ID to the correct
          person — past punches at that location will link automatically.
        </p>
      </div>
      <ul className="divide-y divide-amber-100">
        {rows.map((row) => {
          const key = rowKey(row);
          const staffOptions = staffByLocationId[row.locationId] ?? [];
          const latest = new Date(row.latestPunchAt);
          const latestLabel = Number.isNaN(latest.getTime())
            ? row.latestPunchAt
            : latest.toLocaleString();

          return (
            <li
              key={key}
              className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-[5rem]">
                <span className="rounded bg-white px-2 py-0.5 font-mono text-sm font-semibold text-zinc-900 ring-1 ring-amber-200">
                  {row.deviceUserId}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-zinc-700">
                <span className="font-medium text-zinc-900">{row.locationName}</span>
                <span className="text-zinc-500">
                  {" "}
                  · {row.punchCount} unmapped punch{row.punchCount === 1 ? "" : "es"}
                  {" "}
                  · latest {latestLabel}
                </span>
              </div>
              <label className="sr-only" htmlFor={`map-staff-${key}`}>
                Staff for device user ID {row.deviceUserId}
              </label>
              <select
                id={`map-staff-${key}`}
                value={selection[key] ?? ""}
                onChange={(e) =>
                  setSelection((prev) => ({ ...prev, [key]: e.target.value }))
                }
                disabled={pending}
                className="min-w-[12rem] rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
              >
                <option value="">Select staff…</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                    {s.deviceUserId ? ` (ID ${s.deviceUserId})` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => mapRow(row)}
                disabled={pending || !selection[key]}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Map
              </button>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="border-t border-amber-100 px-4 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="border-t border-amber-100 px-4 py-2 text-sm text-emerald-800">{notice}</p>
      ) : null}
    </section>
  );
}
