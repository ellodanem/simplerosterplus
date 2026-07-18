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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6" />
      <path d="M16.5 3.5v4h-4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 10.5 8.5 14 15 6.5" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-11a1 1 0 100 2 1 1 0 000-2zm1 3.75a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

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
  const [refreshing, setRefreshing] = useState(false);

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

  function handleRefresh() {
    setError(null);
    setRefreshing(true);
    startTransition(async () => {
      try {
        await refresh();
        setNotice(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not refresh unmapped list");
      } finally {
        setRefreshing(false);
      }
    });
  }

  function mapRow(row: UnmappedDeviceUserRow) {
    const key = rowKey(row);
    const staffId = selection[key];
    if (!staffId) {
      setError("Choose a staff member to map this device user ID.");
      return;
    }

    const staff = (staffByLocationId[row.locationId] ?? []).find((s) => s.id === staffId);
    const staffLabel = staff ? `${staff.firstName} ${staff.lastName}` : "staff";

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
        `Mapped ID ${row.deviceUserId} to ${staffLabel}. Linked ${n} past punch${n === 1 ? "" : "es"}.`,
      );
      setSelection((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setRows((prev) => prev.filter((r) => rowKey(r) !== key));
      try {
        await refresh();
      } catch {
        router.refresh();
      }
      router.refresh();
    });
  }

  if (rows.length === 0 && !notice) {
    return null;
  }

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-zinc-200 border-l-4 border-l-emerald-600 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Unmapped device user IDs</h2>
            {rows.length > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-semibold text-white">
                {rows.length}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            Map each terminal ID to the right person — past punches at that location will link
            automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={pending || refreshing}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshIcon className={`h-4 w-4 ${refreshing || pending ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {notice ? (
        <div className="flex items-start gap-2 border-b border-emerald-100 bg-emerald-50/70 px-4 py-2.5 text-sm text-emerald-900">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CheckIcon className="h-3 w-3" />
          </span>
          <p>{notice}</p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="divide-y divide-zinc-100">
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
                className="flex flex-wrap items-center gap-3 px-4 py-3.5 text-sm"
              >
                <div className="min-w-[5rem]">
                  <span className="inline-block rounded-md bg-zinc-50 px-2.5 py-1 font-mono text-base font-semibold tabular-nums text-zinc-900 ring-1 ring-zinc-200">
                    {row.deviceUserId}
                  </span>
                </div>
                <div className="min-w-0 flex-1 text-zinc-600">
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
                  className="min-w-[12rem] rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
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
      ) : null}

      {rows.length > 0 ? (
        <div className="flex items-start gap-2 border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">
          <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <p>
            Punch count is how many recent terminal punches used this ID without a staff match.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="border-t border-zinc-100 px-4 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
