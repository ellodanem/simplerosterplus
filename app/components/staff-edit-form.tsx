"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type StaffEditValues = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  roleId?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  locationId?: string;
  locationName?: string;
  deviceUserId: string;
  contactNumber: string;
  dateOfBirth: string;
  startDate: string;
  punchExempt: boolean;
  excludeFromRoster: boolean;
  archivedAt: string | null;
  isTestUser: boolean;
  sortOrder: number;
  canDelete: boolean;
};

export function StaffEditForm({
  initial,
  onSaved,
  onDeleted,
  onCancel,
}: {
  initial: StaffEditValues;
  onSaved?: (staff: StaffEditValues) => void;
  onDeleted?: (staffId: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [v, setV] = useState<StaffEditValues>(initial);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isArchived = Boolean(v.archivedAt);

  function update<K extends keyof StaffEditValues>(key: K, value: StaffEditValues[K]) {
    setV((s) => ({ ...s, [key]: value }));
  }

  async function loadOptions() {
    const [roleRes, deptRes, locRes] = await Promise.all([
      fetch("/api/roles"),
      fetch("/api/departments"),
      fetch("/api/locations"),
    ]);
    const roleBody = (await roleRes.json().catch(() => ({}))) as {
      roles?: Array<{ id: string; name: string }>;
    };
    const deptBody = (await deptRes.json().catch(() => ({}))) as {
      departments?: Array<{ id: string; name: string }>;
    };
    const locBody = (await locRes.json().catch(() => ({}))) as {
      locations?: Array<{ id: string; name: string }>;
    };
    if (Array.isArray(roleBody.roles)) setRoles(roleBody.roles);
    if (Array.isArray(deptBody.departments)) setDepartments(deptBody.departments);
    if (Array.isArray(locBody.locations)) setLocations(locBody.locations);
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!v.roleId) {
      setError("Role is required");
      return;
    }
    if (!v.locationId) {
      setError("Location is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${encodeURIComponent(v.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: v.firstName,
          lastName: v.lastName,
          email: v.email,
          roleId: v.roleId,
          departmentId: v.departmentId ?? null,
          locationId: v.locationId,
          deviceUserId: v.deviceUserId,
          contactNumber: v.contactNumber,
          dateOfBirth: v.dateOfBirth,
          startDate: v.startDate,
          punchExempt: v.punchExempt,
          excludeFromRoster: v.excludeFromRoster,
          sortOrder: Number.isFinite(v.sortOrder) ? v.sortOrder : 0,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        staff?: StaffEditValues & {
          staffRole?: { id: string; name: string };
          department?: { id: string; name: string } | null;
          location?: { id: string; name: string };
        };
      };
      if (!res.ok) {
        setError(data.error || "Could not save changes");
        return;
      }

      const saved: StaffEditValues = data.staff
        ? {
            ...v,
            role: data.staff.staffRole?.name ?? data.staff.role ?? v.role,
            roleId: data.staff.roleId ?? v.roleId,
            departmentId: data.staff.departmentId ?? null,
            departmentName: data.staff.department?.name ?? null,
            locationId: data.staff.location?.id ?? v.locationId,
            locationName: data.staff.location?.name ?? v.locationName,
          }
        : v;

      setV(saved);
      if (onSaved) {
        onSaved(saved);
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function onArchive() {
    if (
      !confirm(
        `Mark ${v.firstName} ${v.lastName} as no longer with the company?\n\nThey will be removed from current roster and attendance going forward. Punches and shifts at or before this moment stay visible.`,
      )
    ) {
      return;
    }
    setError(null);
    setArchiving(true);
    try {
      const res = await fetch(`/api/staff/${encodeURIComponent(v.id)}/archive`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        staff?: { archivedAt: string | null };
      };
      if (!res.ok) {
        setError(data.error || "Could not archive");
        return;
      }
      const next = { ...v, archivedAt: data.staff?.archivedAt ?? new Date().toISOString() };
      setV(next);
      if (onSaved) onSaved(next);
      else router.refresh();
    } finally {
      setArchiving(false);
    }
  }

  async function onRestore() {
    setError(null);
    setRestoring(true);
    try {
      const res = await fetch(`/api/staff/${encodeURIComponent(v.id)}/restore`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not restore");
        return;
      }
      const next = { ...v, archivedAt: null };
      setV(next);
      if (onSaved) onSaved(next);
      else router.refresh();
    } finally {
      setRestoring(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Permanently delete ${v.firstName} ${v.lastName}? This cannot be undone.`)) {
      return;
    }
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/staff/${encodeURIComponent(v.id)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not delete");
        return;
      }
      if (onDeleted) {
        onDeleted(v.id);
      } else {
        router.push("/staff");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  function handleCancel() {
    if (onCancel) onCancel();
    else router.push("/staff");
  }

  const busy = saving || archiving || restoring || deleting;
  const inModal = Boolean(onSaved || onDeleted || onCancel);

  return (
    <form
      onSubmit={onSubmit}
      className={inModal ? "" : "rounded-xl border border-zinc-200 bg-white p-5"}
    >
      {isArchived ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Archived — no longer with the company. Attendance and roster only show records from
          before{" "}
          {v.archivedAt
            ? new Date(v.archivedAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "archive"}
          .
        </div>
      ) : null}

      {v.isTestUser ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-violet-700">
          Test account (set at creation)
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="ef"
          label="First name"
          required
          value={v.firstName}
          onChange={(x) => update("firstName", x)}
        />
        <Field
          id="el"
          label="Last name"
          required
          value={v.lastName}
          onChange={(x) => update("lastName", x)}
        />
        <Field
          id="ee"
          label="Email"
          type="email"
          value={v.email}
          onChange={(x) => update("email", x)}
        />
        <SelectField
          id="loc"
          label="Location"
          required
          value={v.locationId ?? ""}
          onChange={(x) => {
            update("locationId", x);
            const loc = locations.find((l) => l.id === x);
            if (loc) update("locationName", loc.name);
          }}
          options={locations.map((l) => ({ value: l.id, label: l.name }))}
        />
        <SelectField
          id="role"
          label="Role"
          required
          value={v.roleId ?? ""}
          onChange={(x) => {
            update("roleId", x || null);
            const role = roles.find((r) => r.id === x);
            if (role) update("role", role.name);
          }}
          options={[
            { value: "", label: "Select role…" },
            ...roles.map((r) => ({ value: r.id, label: r.name })),
          ]}
        />
        <SelectField
          id="dept"
          label="Department"
          value={v.departmentId ?? ""}
          onChange={(x) => {
            update("departmentId", x || null);
            const dept = departments.find((d) => d.id === x);
            update("departmentName", dept?.name ?? null);
          }}
          options={[
            { value: "", label: "None" },
            ...departments.map((d) => ({ value: d.id, label: d.name })),
          ]}
        />
        <Field
          id="ep"
          label="Contact number"
          type="tel"
          value={v.contactNumber}
          onChange={(x) => update("contactNumber", x)}
        />
        <Field
          id="ed"
          label="Device user ID"
          value={v.deviceUserId}
          onChange={(x) => update("deviceUserId", x)}
          help="ZKTeco enrolment ID. Unique within the location."
        />
        <Field
          id="edob"
          label="Date of birth"
          type="date"
          value={v.dateOfBirth}
          onChange={(x) => update("dateOfBirth", x)}
        />
        <Field
          id="esd"
          label="Start date"
          type="date"
          value={v.startDate}
          onChange={(x) => update("startDate", x)}
        />
        <div className="sm:col-span-2 space-y-3">
          <label className="flex items-start gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-zinc-300"
              checked={v.punchExempt}
              onChange={(e) => update("punchExempt", e.target.checked)}
            />
            <span>Punch exempt (does not need to clock in/out)</span>
          </label>
          <div>
            <label className="flex items-start gap-2 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-zinc-300"
                checked={v.excludeFromRoster}
                onChange={(e) => update("excludeFromRoster", e.target.checked)}
              />
              <span>Attendance Only</span>
            </label>
            <p className="mt-1 pl-6 text-xs text-zinc-500">
              For managers, office staff, or others who clock in but are not scheduled on
              shifts. Listed in attendance, not on the shift roster.
            </p>
          </div>
        </div>
        <Field
          id="eso"
          label="Sort order"
          type="number"
          value={String(v.sortOrder)}
          onChange={(x) => update("sortOrder", Number(x) || 0)}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {isArchived ? (
          <button
            type="button"
            onClick={onRestore}
            disabled={busy}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
          >
            {restoring ? "Restoring…" : "Restore to active"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onArchive}
            disabled={busy}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          >
            {archiving ? "Archiving…" : "Archive (left company)"}
          </button>
        )}
        {v.canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? "Removing…" : "Delete staff"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleCancel}
          disabled={busy}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          Cancel
        </button>
      </div>
      {!v.canDelete && !v.isTestUser ? (
        <p className="mt-2 text-xs text-zinc-500">
          Staff records are archived when someone leaves, not deleted.
        </p>
      ) : null}
    </form>
  );
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  help?: string;
}) {
  const { id, label, value, onChange, type, required, help } = props;
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600" htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      <input
        id={id}
        type={type ?? "text"}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
      />
      {help ? <p className="mt-1 text-xs text-zinc-500">{help}</p> : null}
    </div>
  );
}

function SelectField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  const { id, label, value, onChange, options, required } = props;
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600" htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      <select
        id={id}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.value || "__empty"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
