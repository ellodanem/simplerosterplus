"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/app/components/modal";

export type LeaveRequestStatus = "requested" | "approved" | "denied";

export type RequestStaff = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
};

export type LeaveRequest = {
  id: string;
  type: "vacation" | "dayOff";
  status: LeaveRequestStatus;
  reason: string | null;
  decidedAt: string | null;
  decidedByEmail: string | null;
  createdAt: string;
  staff: RequestStaff;
  startDate?: string;
  endDate?: string;
  date?: string;
  conflictCount?: number;
  conflictDates?: string[];
};

type ListResponse = {
  vacation: LeaveRequest[];
  dayOff: LeaveRequest[];
  pendingCount: number;
};

type Filter = "requested" | "all";
export type RequestChange =
  | { kind: "approved"; request: LeaveRequest; clearedDates: string[] }
  | { kind: "deletedApproved"; request: LeaveRequest };

/**
 * Approval modal. Self-contained: fetches its own state on open, posts approvals/denials
 * inline, and surfaces conflict-preview + confirm. Parent gets `onPendingCountChange` so the
 * top-bar badge stays accurate without a route refresh, and `onRequestChanged` so the grid can
 * update blocking state when an approved request changes roster availability.
 */
export function RequestsModal({
  open,
  onClose,
  staff,
  onPendingCountChange,
  onRequestChanged,
}: {
  open: boolean;
  onClose: () => void;
  staff: RequestStaff[];
  onPendingCountChange: (n: number) => void;
  onRequestChanged: (change: RequestChange) => void;
}) {
  const [filter, setFilter] = useState<Filter>("requested");
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<{
    request: LeaveRequest;
    conflictCount: number;
    conflictDates: string[];
  } | null>(null);
  const [query, setQuery] = useState("");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const onPendingCountChangeRef = useRef(onPendingCountChange);
  useEffect(() => {
    onPendingCountChangeRef.current = onPendingCountChange;
  }, [onPendingCountChange]);

  const load = useCallback(
    async (f: Filter, opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/requests?status=${f === "all" ? "all" : "requested"}`);
        const body = (await res.json().catch(() => ({}))) as Partial<ListResponse> & {
          error?: string;
        };
        if (!res.ok) throw new Error(body.error || "Could not load requests");
        const next: ListResponse = {
          vacation: body.vacation ?? [],
          dayOff: body.dayOff ?? [],
          pendingCount: body.pendingCount ?? 0,
        };
        setData(next);
        onPendingCountChangeRef.current(next.pendingCount);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load(filter);
    });
    return () => {
      cancelled = true;
    };
  }, [open, filter, load]);

  function busy(id: string): boolean {
    return !!busyIds[id];
  }
  function setBusy(id: string, on: boolean) {
    setBusyIds((prev) => {
      const next = { ...prev };
      if (on) next[id] = true;
      else delete next[id];
      return next;
    });
  }

  async function patchRequest(req: LeaveRequest, action: "approve" | "deny", force: boolean) {
    setBusy(req.id, true);
    setError(null);
    try {
      const res = await fetch(
        `/api/requests/${req.type === "vacation" ? "vacation" : "day-off"}/${encodeURIComponent(req.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...(force ? { force: true } : {}) }),
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        conflictCount?: number;
        conflictDates?: string[];
        requiresConfirm?: boolean;
        request?: LeaveRequest;
        clearedDates?: string[];
      };
      if (res.status === 409 && body.requiresConfirm && action === "approve") {
        setConfirm({
          request: req,
          conflictCount: body.conflictCount ?? 0,
          conflictDates: body.conflictDates ?? [],
        });
        return;
      }
      if (!res.ok) throw new Error(body.error || `Could not ${action} request`);
      await load(filter, { silent: true });
      if (action === "approve" && body.request) {
        onRequestChanged({
          kind: "approved",
          request: body.request,
          clearedDates: body.clearedDates ?? body.conflictDates ?? [],
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(req.id, false);
    }
  }

  async function deleteRequest(req: LeaveRequest) {
    const ok = window.confirm(
      `Delete this ${req.type === "vacation" ? "vacation" : "day-off"} request? This cannot be undone.`,
    );
    if (!ok) return;
    setBusy(req.id, true);
    setError(null);
    try {
      const res = await fetch(
        `/api/requests/${req.type === "vacation" ? "vacation" : "day-off"}/${encodeURIComponent(req.id)}`,
        { method: "DELETE" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        request?: LeaveRequest;
      };
      if (!res.ok) throw new Error(body.error || "Could not delete request");
      await load(filter, { silent: true });
      if (req.status === "approved" && body.request) {
        onRequestChanged({ kind: "deletedApproved", request: body.request });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(req.id, false);
    }
  }

  const filtersActive = query.trim() !== "" || staffFilter !== "all" || dateFilter !== "";

  const grouped = useMemo(() => {
    if (!data) return null;
    const all = [...data.vacation, ...data.dayOff];
    const pendingAll = all.filter((r) => r.status === "requested");
    const decidedAll = all.filter((r) => r.status !== "requested");
    pendingAll.sort(sortByCreatedDesc);
    decidedAll.sort(sortByDecidedThenCreatedDesc);

    const q = query.trim().toLowerCase();
    const matches = (r: LeaveRequest): boolean => {
      if (staffFilter !== "all" && r.staff.id !== staffFilter) return false;
      if (dateFilter && !coversDate(r, dateFilter)) return false;
      if (q) {
        const haystack = `${r.staff.firstName} ${r.staff.lastName} ${r.reason ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    };

    return {
      pending: pendingAll.filter(matches),
      decided: decidedAll.filter(matches),
      pendingTotal: pendingAll.length,
      decidedTotal: decidedAll.length,
    };
  }, [data, query, staffFilter, dateFilter]);

  function clearFilters() {
    setQuery("");
    setStaffFilter("all");
    setDateFilter("");
  }

  const sortedStaff = useMemo(
    () =>
      [...staff].sort((a, b) =>
        (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName),
      ),
    [staff],
  );

  return (
    <>
      <Modal open={open} onClose={onClose} title="Requests" size="xl">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-xs">
              {(["requested", "all"] as const).map((f) => {
                const active = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`rounded px-2.5 py-1 font-medium ${
                      active
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {f === "requested" ? "Pending" : "All"}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowCreate((s) => !s)}
              className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100"
            >
              {showCreate ? "Cancel" : "+ New request"}
            </button>
          </div>

          <FilterRow
            query={query}
            onQueryChange={setQuery}
            staffFilter={staffFilter}
            onStaffFilterChange={setStaffFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            staff={sortedStaff}
            active={filtersActive}
            onClear={clearFilters}
          />

          {showCreate ? (
            <CreateRequestForm
              staff={sortedStaff}
              onCreated={() => {
                setShowCreate(false);
                load(filter, { silent: true });
              }}
              onError={setError}
            />
          ) : null}

          {error ? (
            <div
              className="flex items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-900"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          ) : null}

          {loading && !data ? (
            <div className="py-8 text-center text-sm text-zinc-500">Loading…</div>
          ) : !grouped ? null : (
            <>
              <Section
                title="Pending"
                items={grouped.pending}
                total={grouped.pendingTotal}
                filtersActive={filtersActive}
                empty={
                  filtersActive
                    ? "No pending requests match these filters."
                    : "No pending requests."
                }
                renderRow={(req) => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    busy={busy(req.id)}
                    onApprove={() => patchRequest(req, "approve", false)}
                    onDeny={() => patchRequest(req, "deny", false)}
                    onDelete={() => deleteRequest(req)}
                  />
                )}
              />
              {filter === "all" ? (
                <Section
                  title="Decided"
                  items={grouped.decided}
                  total={grouped.decidedTotal}
                  filtersActive={filtersActive}
                  empty={
                    filtersActive
                      ? "No decided requests match these filters."
                      : "No decided requests yet."
                  }
                  renderRow={(req) => (
                    <RequestRow
                      key={req.id}
                      req={req}
                      busy={busy(req.id)}
                      onDelete={() => deleteRequest(req)}
                    />
                  )}
                />
              ) : null}
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Approve and clear shifts?"
        size="md"
      >
        {confirm ? (
          <ConfirmForceApprove
            confirm={confirm}
            onCancel={() => setConfirm(null)}
            onConfirm={async () => {
              const c = confirm;
              setConfirm(null);
              await patchRequest(c.request, "approve", true);
            }}
          />
        ) : null}
      </Modal>
    </>
  );
}

function sortByCreatedDesc(a: LeaveRequest, b: LeaveRequest): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function sortByDecidedThenCreatedDesc(a: LeaveRequest, b: LeaveRequest): number {
  const ad = a.decidedAt ?? a.createdAt;
  const bd = b.decidedAt ?? b.createdAt;
  return bd.localeCompare(ad);
}

/** Does the request cover `ymd`? Vacations match any day inside the range; day-offs match
 * the exact date. ISO-formatted YMD strings compare correctly lexicographically. */
function coversDate(r: LeaveRequest, ymd: string): boolean {
  if (r.type === "vacation") {
    if (!r.startDate || !r.endDate) return false;
    return ymd >= r.startDate && ymd <= r.endDate;
  }
  return r.date === ymd;
}

function Section({
  title,
  items,
  total,
  filtersActive,
  empty,
  renderRow,
}: {
  title: string;
  items: LeaveRequest[];
  total: number;
  filtersActive: boolean;
  empty: string;
  renderRow: (req: LeaveRequest) => React.ReactNode;
}) {
  let countSuffix: React.ReactNode = null;
  if (total > 0) {
    countSuffix = filtersActive ? (
      <span className="text-zinc-400">
        · {items.length} of {total}
      </span>
    ) : (
      <span className="text-zinc-400">· {total}</span>
    );
  }
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {title} {countSuffix}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white">
          {items.map((req) => renderRow(req))}
        </ul>
      )}
    </section>
  );
}

function FilterRow({
  query,
  onQueryChange,
  staffFilter,
  onStaffFilterChange,
  dateFilter,
  onDateFilterChange,
  staff,
  active,
  onClear,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  staffFilter: string;
  onStaffFilterChange: (v: string) => void;
  dateFilter: string;
  onDateFilterChange: (v: string) => void;
  staff: RequestStaff[];
  active: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search staff or reason"
          aria-label="Search requests"
          className="w-full rounded-md border border-zinc-300 bg-white py-1 pl-7 pr-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
        />
      </div>
      <select
        value={staffFilter}
        onChange={(e) => onStaffFilterChange(e.target.value)}
        aria-label="Filter by staff"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700"
      >
        <option value="all">All staff</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.firstName} {s.lastName}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={dateFilter}
        onChange={(e) => onDateFilterChange(e.target.value)}
        title="Show requests that cover this date"
        aria-label="Filter by date"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700"
      />
      {active ? (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function RequestRow({
  req,
  busy,
  onApprove,
  onDeny,
  onDelete,
}: {
  req: LeaveRequest;
  busy: boolean;
  onApprove?: () => void;
  onDeny?: () => void;
  onDelete: () => void;
}) {
  const dateLabel =
    req.type === "vacation"
      ? formatRange(req.startDate, req.endDate)
      : (req.date ?? "—");
  const typeLabel = req.type === "vacation" ? "Vacation" : "Day off";
  const conflict = req.status === "requested" && (req.conflictCount ?? 0) > 0;

  return (
    <li className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">
            {req.staff.firstName} {req.staff.lastName}
          </span>
          {req.staff.role ? (
            <span className="text-xs text-zinc-500">· {req.staff.role}</span>
          ) : null}
          <StatusPill status={req.status} type={req.type} />
        </div>
        <div className="mt-0.5 text-sm text-zinc-700">
          <span className="font-medium text-zinc-600">{typeLabel}:</span> {dateLabel}
        </div>
        {req.reason ? (
          <p className="mt-1 max-w-prose whitespace-pre-wrap text-xs text-zinc-600">{req.reason}</p>
        ) : null}
        {req.status !== "requested" && req.decidedAt ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            {req.status === "approved" ? "Approved" : "Denied"}
            {req.decidedByEmail ? ` by ${req.decidedByEmail}` : ""} ·{" "}
            {new Date(req.decidedAt).toLocaleString()}
          </p>
        ) : null}
        {conflict ? (
          <p className="mt-1 text-[11px] text-amber-700">
            Approving will clear {req.conflictCount} {req.conflictCount === 1 ? "shift" : "shifts"} already on the roster.
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        {onApprove ? (
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Approve
          </button>
        ) : null}
        {onDeny ? (
          <button
            type="button"
            onClick={onDeny}
            disabled={busy}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Deny
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          title="Delete request"
          aria-label="Delete request"
          className="rounded-md border border-zinc-200 bg-white p-1 text-zinc-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>
    </li>
  );
}

function StatusPill({
  status,
  type,
}: {
  status: LeaveRequestStatus;
  type: "vacation" | "dayOff";
}) {
  const cls =
    status === "approved"
      ? type === "vacation"
        ? "bg-amber-100 text-amber-800"
        : "bg-sky-100 text-sky-800"
      : status === "denied"
        ? "bg-zinc-200 text-zinc-700"
        : "bg-rose-100 text-rose-800";
  const label = status === "requested" ? "Pending" : status === "approved" ? "Approved" : "Denied";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function formatRange(start?: string, end?: string): string {
  if (!start || !end) return "—";
  if (start === end) return start;
  return `${start} → ${end}`;
}

function CreateRequestForm({
  staff,
  onCreated,
  onError,
}: {
  staff: RequestStaff[];
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [type, setType] = useState<"vacation" | "dayOff">("vacation");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId) {
      onError("Pick a staff member.");
      return;
    }
    setSubmitting(true);
    try {
      const url =
        type === "vacation" ? "/api/requests/vacation" : "/api/requests/day-off";
      const payload: Record<string, unknown> = {
        staffId,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      };
      if (type === "vacation") {
        if (!startDate || !endDate) {
          onError("Pick both a start and end date.");
          setSubmitting(false);
          return;
        }
        payload.startDate = startDate;
        payload.endDate = endDate;
      } else {
        if (!date) {
          onError("Pick a date.");
          setSubmitting(false);
          return;
        }
        payload.date = date;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not create request");
      setReason("");
      setDate("");
      setStartDate("");
      setEndDate("");
      onCreated();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "vacation" | "dayOff")}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
          >
            <option value="vacation">Vacation</option>
            <option value="dayOff">Day off</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
          Staff <span className="text-red-600">*</span>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            required
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
          >
            {staff.length === 0 ? (
              <option value="">No staff available</option>
            ) : (
              staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))
            )}
          </select>
        </label>
        {type === "vacation" ? (
          <>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
              Start date <span className="text-red-600">*</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
              End date <span className="text-red-600">*</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                required
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
              />
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700 sm:col-span-2">
            Date <span className="text-red-600">*</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700 sm:col-span-2">
          Reason
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Optional context for the approver"
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </form>
  );
}

function ConfirmForceApprove({
  confirm,
  onCancel,
  onConfirm,
}: {
  confirm: { request: LeaveRequest; conflictCount: number; conflictDates: string[] };
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { request: req, conflictCount, conflictDates } = confirm;
  const typeLabel = req.type === "vacation" ? "vacation" : "day off";
  const noun = conflictCount === 1 ? "shift" : "shifts";
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-700">
        Approving this {typeLabel} for{" "}
        <span className="font-semibold text-zinc-900">
          {req.staff.firstName} {req.staff.lastName}
        </span>{" "}
        will clear <span className="font-semibold text-zinc-900">{conflictCount}</span> {noun}{" "}
        already on the roster.
      </p>
      {conflictDates.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <div className="font-semibold">Affected dates</div>
          <div className="mt-0.5 break-words font-mono">{conflictDates.join(", ")}</div>
        </div>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md border border-emerald-300 bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          Approve and clear shifts
        </button>
      </div>
    </div>
  );
}
