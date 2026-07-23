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

export type RequestShiftTemplate = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

export type LeaveRequest = {
  id: string;
  type: "vacation" | "dayOff" | "sickLeave" | "shiftRequest";
  status: LeaveRequestStatus;
  reason: string | null;
  decidedAt: string | null;
  decidedByEmail: string | null;
  createdAt: string;
  staff: RequestStaff;
  startDate?: string;
  endDate?: string;
  date?: string;
  shiftTemplateId?: string;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  scheduledShiftName?: string | null;
  conflictCount?: number;
  conflictDates?: string[];
};

type ListResponse = {
  vacation: LeaveRequest[];
  dayOff: LeaveRequest[];
  sickLeave: LeaveRequest[];
  shiftRequest: LeaveRequest[];
  pendingCount: number;
};

type Filter = "requested" | "all";
export type RequestsModalIntent = "create" | "review";
export type RequestChange =
  | { kind: "approved"; request: LeaveRequest; clearedDates: string[] }
  | { kind: "deletedApproved"; request: LeaveRequest }
  | { kind: "shiftPreferenceSet"; request: LeaveRequest }
  | { kind: "shiftPreferenceClear"; request: LeaveRequest };

function isLeaveRequest(req: LeaveRequest): boolean {
  return req.type === "vacation" || req.type === "dayOff" || req.type === "sickLeave";
}

function requestApiPath(type: LeaveRequest["type"], id?: string): string {
  const base =
    type === "vacation"
      ? "vacation"
      : type === "dayOff"
        ? "day-off"
        : type === "sickLeave"
          ? "sick-leave"
          : "shift";
  return id ? `/api/requests/${base}/${encodeURIComponent(id)}` : `/api/requests/${base}`;
}

/**
 * Requests modal. Self-contained: fetches its own state on open, posts approvals/denials
 * inline, and surfaces conflict-preview + confirm for leave. Shift requests are soft
 * preferences (approve does not change the roster). Parent gets `onPendingCountChange` so the
 * top-bar badge stays accurate without a route refresh, and `onRequestChanged` so the grid can
 * update blocking state when an approved leave request changes roster availability.
 *
 * `intent` selects the entry path: create opens with the new-request form expanded; review
 * opens on the pending queue (home deep-links use review).
 */
export function RequestsModal({
  open,
  onClose,
  staff,
  shiftTemplates,
  intent = "review",
  onPendingCountChange,
  onRequestChanged,
}: {
  open: boolean;
  onClose: () => void;
  staff: RequestStaff[];
  shiftTemplates: RequestShiftTemplate[];
  intent?: RequestsModalIntent;
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

  useEffect(() => {
    if (!open) return;
    setShowCreate(intent === "create");
    setFilter("requested");
    setQuery("");
    setStaffFilter("all");
    setDateFilter("");
    setError(null);
  }, [open, intent]);

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
          sickLeave: body.sickLeave ?? [],
          shiftRequest: body.shiftRequest ?? [],
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
      const res = await fetch(requestApiPath(req.type, req.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(force ? { force: true } : {}) }),
      });
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
      // Soft shift approve does not change roster blocks — only notify parent for leave.
      if (action === "approve" && body.request && isLeaveRequest(body.request)) {
        onRequestChanged({
          kind: "approved",
          request: body.request,
          clearedDates: body.clearedDates ?? body.conflictDates ?? [],
        });
      } else if (body.request?.type === "shiftRequest") {
        if (action === "approve") {
          onRequestChanged({ kind: "shiftPreferenceSet", request: body.request });
        } else {
          onRequestChanged({ kind: "shiftPreferenceClear", request: body.request });
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(req.id, false);
    }
  }

  async function deleteRequest(req: LeaveRequest) {
    const ok = window.confirm(
      `Delete this ${requestTypeNoun(req.type)} request? This cannot be undone.`,
    );
    if (!ok) return;
    setBusy(req.id, true);
    setError(null);
    try {
      const res = await fetch(requestApiPath(req.type, req.id), { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        request?: LeaveRequest;
      };
      if (!res.ok) throw new Error(body.error || "Could not delete request");
      await load(filter, { silent: true });
      if (req.status === "approved" && body.request && isLeaveRequest(body.request)) {
        onRequestChanged({ kind: "deletedApproved", request: body.request });
      } else if (
        body.request?.type === "shiftRequest" &&
        (req.status === "requested" || req.status === "approved")
      ) {
        onRequestChanged({ kind: "shiftPreferenceClear", request: body.request });
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
    const all = [...data.vacation, ...data.dayOff, ...data.sickLeave, ...data.shiftRequest];
    const pendingAll = all.filter((r) => r.status === "requested");
    const decidedAll = all.filter((r) => r.status !== "requested");
    pendingAll.sort(sortByCreatedDesc);
    decidedAll.sort(sortByDecidedThenCreatedDesc);

    const q = query.trim().toLowerCase();
    const matches = (r: LeaveRequest): boolean => {
      if (staffFilter !== "all" && r.staff.id !== staffFilter) return false;
      if (dateFilter && !coversDate(r, dateFilter)) return false;
      if (q) {
        const haystack =
          `${r.staff.firstName} ${r.staff.lastName} ${r.reason ?? ""} ${r.shiftName ?? ""}`.toLowerCase();
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
      <Modal
        open={open}
        onClose={onClose}
        title={showCreate ? "New request" : "Review requests"}
        size="xl"
      >
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
              shiftTemplates={shiftTemplates}
              onCreated={(created, opts) => {
                setShowCreate(false);
                if (created && opts?.approveNow && isLeaveRequest(created)) {
                  void patchRequest(created, "approve", false);
                  return;
                }
                load(filter, { silent: true });
                if (created?.type === "shiftRequest" && created.status === "requested") {
                  onRequestChanged({ kind: "shiftPreferenceSet", request: created });
                }
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

/** Does the request cover `ymd`? Vacations match any day inside the range; day-offs and
 * shift requests match the exact date. ISO-formatted YMD strings compare correctly
 * lexicographically. */
function coversDate(r: LeaveRequest, ymd: string): boolean {
  if (r.type === "vacation" || r.type === "sickLeave") {
    if (!r.startDate || !r.endDate) return false;
    return ymd >= r.startDate && ymd <= r.endDate;
  }
  return r.date === ymd;
}

function requestTypeLabel(type: LeaveRequest["type"]): string {
  if (type === "vacation") return "Vacation";
  if (type === "dayOff") return "Day off";
  if (type === "sickLeave") return "Sick leave";
  return "Shift";
}

function requestTypeNoun(type: LeaveRequest["type"]): string {
  if (type === "vacation") return "vacation";
  if (type === "dayOff") return "day-off";
  if (type === "sickLeave") return "sick leave";
  return "shift";
}

/** One-line skim label: type · details (date / range / shift name). */
function requestSummaryLabel(req: LeaveRequest): string {
  if (req.type === "vacation" || req.type === "sickLeave") {
    return `${requestTypeLabel(req.type)} · ${formatRange(req.startDate, req.endDate)}`;
  }
  if (req.type === "dayOff") {
    return `${requestTypeLabel(req.type)} · ${req.date ?? "—"}`;
  }
  const shift = req.shiftName ?? "Shift";
  const times =
    req.shiftStartTime && req.shiftEndTime
      ? ` (${req.shiftStartTime}–${req.shiftEndTime})`
      : "";
  return `${requestTypeLabel(req.type)} · ${shift}${times} · ${req.date ?? "—"}`;
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
  const conflict =
    isLeaveRequest(req) && req.status === "requested" && (req.conflictCount ?? 0) > 0;
  const scheduledMismatch =
    req.type === "shiftRequest" &&
    req.status === "requested" &&
    !!req.scheduledShiftName;

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
        <div className="mt-0.5 text-sm text-zinc-700">{requestSummaryLabel(req)}</div>
        {req.reason ? (
          <p className="mt-1 max-w-prose whitespace-pre-wrap text-xs text-zinc-600">{req.reason}</p>
        ) : null}
        {req.status !== "requested" && req.decidedAt ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            {req.status === "approved"
              ? req.type === "shiftRequest"
                ? "Approved preference"
                : "Approved"
              : "Denied"}
            {req.decidedByEmail ? ` by ${req.decidedByEmail}` : ""} ·{" "}
            {new Date(req.decidedAt).toLocaleString()}
          </p>
        ) : null}
        {req.type === "shiftRequest" && req.status === "requested" ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            Approve records a preference only — does not change the roster.
          </p>
        ) : null}
        {scheduledMismatch ? (
          <p className="mt-1 text-[11px] text-amber-700">
            Already scheduled as {req.scheduledShiftName} that day — approve still only
            records the preference.
          </p>
        ) : null}
        {conflict ? (
          <p className="mt-1 text-[11px] text-amber-700">
            Approving will clear {req.conflictCount}{" "}
            {req.conflictCount === 1 ? "shift" : "shifts"} already on the roster.
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
  type: LeaveRequest["type"];
}) {
  const cls =
    status === "approved"
      ? type === "vacation"
        ? "bg-amber-100 text-amber-800"
        : type === "dayOff"
          ? "bg-sky-100 text-sky-800"
          : type === "sickLeave"
            ? "bg-orange-100 text-orange-800"
            : "bg-violet-100 text-violet-800"
      : status === "denied"
        ? "bg-zinc-200 text-zinc-700"
        : "bg-rose-100 text-rose-800";
  const label =
    status === "requested"
      ? "Pending"
      : status === "approved"
        ? type === "shiftRequest"
          ? "Preference"
          : "Approved"
        : "Denied";
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
  shiftTemplates,
  onCreated,
  onError,
}: {
  staff: RequestStaff[];
  shiftTemplates: RequestShiftTemplate[];
  onCreated: (created?: LeaveRequest, opts?: { approveNow?: boolean }) => void;
  onError: (msg: string) => void;
}) {
  const [type, setType] = useState<"vacation" | "dayOff" | "sickLeave" | "shiftRequest">(
    "vacation",
  );
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [shiftTemplateId, setShiftTemplateId] = useState(shiftTemplates[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [approveNow, setApproveNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const sortedTemplates = useMemo(
    () => [...shiftTemplates].sort((a, b) => a.name.localeCompare(b.name)),
    [shiftTemplates],
  );

  const usesDateRange = type === "vacation" || type === "sickLeave";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId) {
      onError("Pick a staff member.");
      return;
    }
    setSubmitting(true);
    try {
      const url = requestApiPath(type);
      const payload: Record<string, unknown> = {
        staffId,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      };
      if (usesDateRange) {
        if (!startDate || !endDate) {
          onError("Pick both a start and end date.");
          setSubmitting(false);
          return;
        }
        payload.startDate = startDate;
        payload.endDate = endDate;
      } else if (type === "dayOff") {
        if (!date) {
          onError("Pick a date.");
          setSubmitting(false);
          return;
        }
        payload.date = date;
      } else {
        if (!date) {
          onError("Pick a date.");
          setSubmitting(false);
          return;
        }
        if (!shiftTemplateId) {
          onError("Pick a shift.");
          setSubmitting(false);
          return;
        }
        payload.date = date;
        payload.shiftTemplateId = shiftTemplateId;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        request?: LeaveRequest;
      };
      if (!res.ok) throw new Error(body.error || "Could not create request");
      setReason("");
      setDate("");
      setStartDate("");
      setEndDate("");
      onCreated(body.request, {
        approveNow: type === "sickLeave" && approveNow,
      });
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
            onChange={(e) =>
              setType(
                e.target.value as "vacation" | "dayOff" | "sickLeave" | "shiftRequest",
              )
            }
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
          >
            <option value="vacation">Vacation</option>
            <option value="dayOff">Day off</option>
            <option value="sickLeave">Sick leave</option>
            <option value="shiftRequest">Shift request</option>
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
        {usesDateRange ? (
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
        ) : type === "dayOff" ? (
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
        ) : (
          <>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
              Date <span className="text-red-600">*</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
              Shift <span className="text-red-600">*</span>
              <select
                value={shiftTemplateId}
                onChange={(e) => setShiftTemplateId(e.target.value)}
                required
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
              >
                {sortedTemplates.length === 0 ? (
                  <option value="">No shifts configured</option>
                ) : (
                  sortedTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.startTime}–{t.endTime})
                    </option>
                  ))
                )}
              </select>
            </label>
          </>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700 sm:col-span-2">
          Reason
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder={
              type === "sickLeave"
                ? "Optional — e.g. doctor’s note period"
                : "Optional context for the approver"
            }
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
          />
        </label>
        {type === "sickLeave" ? (
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={approveNow}
              onChange={(e) => setApproveNow(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Approve immediately (clears overlapping shifts)
          </label>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Submitting…"
            : type === "sickLeave" && approveNow
              ? "Submit & approve"
              : "Submit request"}
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
  const typeLabel = requestTypeNoun(req.type);
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
