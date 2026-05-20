"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type StaffEditValues = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  deviceUserId: string;
  contactNumber: string;
  dateOfBirth: string;
  startDate: string;
  punchExempt: boolean;
  isActive: boolean;
  excludeFromRoster: boolean;
  sortOrder: number;
};

export function StaffEditForm({
  initial,
  onSaved,
  onDeleted,
  onCancel,
}: {
  initial: StaffEditValues;
  /** Called after a successful save. If provided, the form will not call router.refresh itself. */
  onSaved?: () => void;
  /** Called after a successful delete. If omitted, the form falls back to navigating to /staff. */
  onDeleted?: () => void;
  /** Called when the user clicks Cancel. If omitted, the form falls back to navigating to /staff. */
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [v, setV] = useState<StaffEditValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function update<K extends keyof StaffEditValues>(key: K, value: StaffEditValues[K]) {
    setV((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${encodeURIComponent(v.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: v.firstName,
          lastName: v.lastName,
          email: v.email,
          role: v.role,
          deviceUserId: v.deviceUserId,
          contactNumber: v.contactNumber,
          dateOfBirth: v.dateOfBirth,
          startDate: v.startDate,
          punchExempt: v.punchExempt,
          isActive: v.isActive,
          excludeFromRoster: v.excludeFromRoster,
          sortOrder: Number.isFinite(v.sortOrder) ? v.sortOrder : 0,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not save changes");
        return;
      }
      if (onSaved) {
        onSaved();
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Remove ${v.firstName} ${v.lastName}? This cannot be undone.`)) return;
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
        onDeleted();
      } else {
        router.push("/staff");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
      router.push("/staff");
    }
  }

  const inModal = Boolean(onSaved || onDeleted || onCancel);

  return (
    <form
      onSubmit={onSubmit}
      className={inModal ? "" : "rounded-xl border border-zinc-200 bg-white p-5"}
    >
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
        <Field
          id="er"
          label="Role"
          required
          value={v.role}
          onChange={(x) => update("role", x)}
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
          help="ZKTeco enrolment ID. Unique within the organization."
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
                checked={v.isActive}
                onChange={(e) => update("isActive", e.target.checked)}
              />
              <span>Plan on roster (current and future weeks)</span>
            </label>
            <p className="mt-1 pl-6 text-xs text-zinc-500">
              Uncheck when they leave the team. They stop appearing on new weeks; past weeks
              that already have their shifts stay on the roster.
            </p>
          </div>
          <div>
            <label className="flex items-start gap-2 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-zinc-300"
                checked={v.excludeFromRoster}
                onChange={(e) => update("excludeFromRoster", e.target.checked)}
              />
              <span>Never show on roster (attendance only)</span>
            </label>
            <p className="mt-1 pl-6 text-xs text-zinc-500">
              For managers, office staff, or others who clock in but are not scheduled on
              shifts. They still appear in attendance; the roster grid never lists them.
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
          disabled={saving || deleting}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={saving || deleting}
          className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {deleting ? "Removing…" : "Delete staff"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving || deleting}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          Cancel
        </button>
      </div>
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
