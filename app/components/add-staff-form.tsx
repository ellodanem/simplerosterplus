"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { StaffEditValues } from "@/app/components/staff-edit-form";

export function AddStaffForm({
  requiredOnly = false,
  variant = "page",
  locations = [],
  roles = [],
  departments = [],
  onRolesChange,
  onSuccess,
  onCancel,
}: {
  /** When true, only first name, last name, location, and role are shown. */
  requiredOnly?: boolean;
  /** Page variant keeps the bordered section on /staff; modal variant is for dialogs. */
  variant?: "page" | "modal";
  locations?: Array<{ id: string; name: string }>;
  roles?: Array<{ id: string; name: string }>;
  departments?: Array<{ id: string; name: string }>;
  onRolesChange?: (roles: Array<{ id: string; name: string }>) => void;
  /** Called after a successful add. If provided, the form will not call router.refresh itself. */
  onSuccess?: (staff: StaffEditValues) => void;
  onCancel?: () => void;
} = {}) {
  const router = useRouter();
  const firstNameRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [deviceUserId, setDeviceUserId] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [excludeFromRoster, setExcludeFromRoster] = useState(false);
  const [isTestUser, setIsTestUser] = useState(false);
  const [showQuickAddRole, setShowQuickAddRole] = useState(false);
  const [quickRoleName, setQuickRoleName] = useState("");
  const [quickRolePending, setQuickRolePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setRoleId("");
    setDepartmentId("");
    setLocationId(locations[0]?.id ?? "");
    setDeviceUserId("");
    setContactNumber("");
    setDateOfBirth("");
    setStartDate("");
    setExcludeFromRoster(false);
    setIsTestUser(false);
    setShowQuickAddRole(false);
    setQuickRoleName("");
  }

  async function quickAddRole() {
    const name = quickRoleName.trim();
    if (!name) return;

    setError(null);
    setQuickRolePending(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        warning?: string;
        role?: { id: string; name: string };
      };
      if (!res.ok || !data.role) {
        setError(data.error || "Could not add role");
        return;
      }
      const nextRoles = [...roles, data.role].sort((a, b) => a.name.localeCompare(b.name));
      onRolesChange?.(nextRoles);
      setRoleId(data.role.id);
      setQuickRoleName("");
      setShowQuickAddRole(false);
      if (data.warning) setMessage(data.warning);
    } finally {
      setQuickRolePending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!locationId) {
      setError("Location is required");
      return;
    }
    if (!roleId) {
      setError("Role is required");
      return;
    }

    setPending(true);
    try {
      const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      const addAnother = submitter?.value === "add-another";
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email.trim() || null,
          roleId,
          departmentId: departmentId || null,
          locationId,
          deviceUserId: deviceUserId.trim() || null,
          contactNumber: contactNumber.trim() || null,
          dateOfBirth: dateOfBirth || null,
          startDate: startDate || null,
          excludeFromRoster: requiredOnly ? false : excludeFromRoster,
          isTestUser: requiredOnly ? false : isTestUser,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        staff?: Partial<StaffEditValues> & {
          archivedAt?: string | null;
          dateOfBirth?: string | null;
          startDate?: string | null;
          location?: { id: string; name: string };
          staffRole?: { id: string; name: string };
          department?: { id: string; name: string } | null;
        };
      };
      if (!res.ok) {
        setError(data.error || "Could not add staff");
        return;
      }
      const createdStaff =
        data.staff && data.staff.id
          ? ({
              id: data.staff.id,
              firstName: data.staff.firstName ?? firstName,
              lastName: data.staff.lastName ?? lastName,
              email: data.staff.email ?? email,
              role: data.staff.staffRole?.name ?? data.staff.role ?? "",
              roleId: data.staff.roleId ?? roleId,
              departmentId: data.staff.departmentId ?? (departmentId || null),
              departmentName: data.staff.department?.name ?? null,
              locationId: data.staff.location?.id ?? locationId,
              locationName: data.staff.location?.name ?? "",
              deviceUserId: data.staff.deviceUserId ?? deviceUserId,
              contactNumber: data.staff.contactNumber ?? contactNumber,
              dateOfBirth: data.staff.dateOfBirth?.slice(0, 10) ?? dateOfBirth,
              startDate: data.staff.startDate?.slice(0, 10) ?? startDate,
              punchExempt: Boolean(data.staff.punchExempt),
              excludeFromRoster: Boolean(data.staff.excludeFromRoster),
              archivedAt: data.staff.archivedAt ?? null,
              isTestUser: Boolean(data.staff.isTestUser),
              sortOrder:
                typeof data.staff.sortOrder === "number" && Number.isFinite(data.staff.sortOrder)
                  ? data.staff.sortOrder
                  : 0,
              canDelete: Boolean(data.staff.canDelete),
            } satisfies StaffEditValues)
          : null;
      if (createdStaff && onSuccess) {
        onSuccess(createdStaff);
      } else {
        router.refresh();
      }

      if (addAnother || !onCancel) {
        resetForm();
      }

      if (addAnother) {
        const addedName =
          createdStaff?.firstName && createdStaff?.lastName
            ? `${createdStaff.firstName} ${createdStaff.lastName}`
            : `${firstName} ${lastName}`.trim() || "staff member";
        setMessage(`Added ${addedName}. Ready for another.`);
        queueMicrotask(() => firstNameRef.current?.focus());
        return;
      }

      if (onCancel) {
        onCancel();
      }
    } finally {
      setPending(false);
    }
  }

  const formClassName =
    variant === "page"
      ? "mt-8 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4"
      : "";

  return (
    <form
      onSubmit={onSubmit}
      onInputCapture={() => setMessage(null)}
      className={formClassName}
    >
      {variant === "page" ? (
        <h2 className="text-sm font-semibold text-zinc-800">Add staff</h2>
      ) : null}
      <div className={`grid gap-3 sm:grid-cols-2 ${variant === "page" ? "mt-3" : ""}`}>
        <Field
          id="nf"
          label="First name"
          required
          value={firstName}
          onChange={setFirstName}
          inputRef={firstNameRef}
        />
        <Field id="nl" label="Last name" required value={lastName} onChange={setLastName} />
        {requiredOnly ? null : (
          <Field id="ne" label="Email" type="email" value={email} onChange={setEmail} />
        )}
        <SelectField
          id="nloc"
          label="Location"
          required
          value={locationId}
          onChange={setLocationId}
          options={
            locations.length > 0
              ? locations.map((l) => ({ value: l.id, label: l.name }))
              : [{ value: "", label: "No locations — complete setup first" }]
          }
        />
        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="nrole">
            Role<span className="ml-0.5 text-red-600">*</span>
          </label>
          <div className="mt-1 flex gap-2">
            <select
              id="nrole"
              required
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
            >
              <option value="">Select role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              title="Add role"
              onClick={() => setShowQuickAddRole((v) => !v)}
              className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              +
            </button>
          </div>
          {showQuickAddRole ? (
            <div className="mt-2 flex gap-2">
              <input
                value={quickRoleName}
                onChange={(e) => setQuickRoleName(e.target.value)}
                placeholder="New role name"
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={quickRolePending || !quickRoleName.trim()}
                onClick={() => void quickAddRole()}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {quickRolePending ? "…" : "Add"}
              </button>
            </div>
          ) : null}
        </div>
        {requiredOnly ? null : (
          <SelectField
            id="ndep"
            label="Department"
            value={departmentId}
            onChange={setDepartmentId}
            options={[
              { value: "", label: "None" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        )}
        {requiredOnly ? null : (
          <>
            <Field
              id="np"
              label="Contact number"
              type="tel"
              value={contactNumber}
              onChange={setContactNumber}
            />
            <Field
              id="nd"
              label="Device user ID"
              value={deviceUserId}
              onChange={setDeviceUserId}
              help="Matches the user enrolment on your ZKTeco terminal. Must be unique within the location."
            />
            <Field
              id="ndob"
              label="Date of birth"
              type="date"
              value={dateOfBirth}
              onChange={setDateOfBirth}
            />
            <Field
              id="nsd"
              label="Start date"
              type="date"
              value={startDate}
              onChange={setStartDate}
            />
            <div className="sm:col-span-2">
              <label className="flex items-start gap-2 text-sm font-medium text-zinc-800">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-zinc-300"
                  checked={excludeFromRoster}
                  onChange={(e) => setExcludeFromRoster(e.target.checked)}
                />
                <span>Attendance Only</span>
              </label>
              <p className="mt-1 pl-6 text-xs text-zinc-500">
                Managers and punch-only staff: listed in attendance, not on the shift roster.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-start gap-2 text-sm font-medium text-zinc-800">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-zinc-300"
                  checked={isTestUser}
                  onChange={(e) => setIsTestUser(e.target.checked)}
                />
                <span>Test / dummy account</span>
              </label>
              <p className="mt-1 pl-6 text-xs text-zinc-500">
                For trials only. Can be deleted later if it has no roster or attendance data.
                Cannot be changed after creation.
              </p>
            </div>
          </>
        )}
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
      <div className={`flex flex-wrap items-center gap-2 ${variant === "page" ? "mt-3" : "mt-4"}`}>
        <button
          type="submit"
          value="add"
          disabled={pending || roles.length === 0 || locations.length === 0}
          className={
            variant === "page"
              ? "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              : "rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          }
        >
          {pending ? "Saving…" : "Add"}
        </button>
        {variant === "modal" ? (
          <button
            type="submit"
            value="add-another"
            disabled={pending || roles.length === 0 || locations.length === 0}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Add New"}
          </button>
        ) : null}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-60"
          >
            Cancel
          </button>
        ) : null}
      </div>
      {roles.length === 0 ? (
        <p className="mt-2 text-sm text-amber-700">Add at least one role before adding staff.</p>
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
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const { id, label, value, onChange, type, required, help, inputRef } = props;
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600" htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      <input
        ref={inputRef}
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
