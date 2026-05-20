"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddStaffForm({
  requiredOnly = false,
  variant = "page",
  onSuccess,
  onCancel,
}: {
  /** When true, only first name, last name, and role are shown. */
  requiredOnly?: boolean;
  /** Page variant keeps the bordered section on /staff; modal variant is for dialogs. */
  variant?: "page" | "modal";
  /** Called after a successful add. If provided, the form will not call router.refresh itself. */
  onSuccess?: () => void;
  onCancel?: () => void;
} = {}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [deviceUserId, setDeviceUserId] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [excludeFromRoster, setExcludeFromRoster] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email.trim() || null,
          role,
          deviceUserId: deviceUserId.trim() || null,
          contactNumber: contactNumber.trim() || null,
          dateOfBirth: dateOfBirth || null,
          startDate: startDate || null,
          excludeFromRoster: requiredOnly ? false : excludeFromRoster,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not add staff");
        return;
      }
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("");
      setDeviceUserId("");
      setContactNumber("");
      setDateOfBirth("");
      setStartDate("");
      setExcludeFromRoster(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
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
    <form onSubmit={onSubmit} className={formClassName}>
      {variant === "page" ? (
        <h2 className="text-sm font-semibold text-zinc-800">Add staff</h2>
      ) : null}
      <div className={`grid gap-3 sm:grid-cols-2 ${variant === "page" ? "mt-3" : ""}`}>
        <Field id="nf" label="First name" required value={firstName} onChange={setFirstName} />
        <Field id="nl" label="Last name" required value={lastName} onChange={setLastName} />
        {requiredOnly ? null : (
          <Field id="ne" label="Email" type="email" value={email} onChange={setEmail} />
        )}
        <Field id="nr" label="Role" required value={role} onChange={setRole} />
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
              help="Matches the user enrolment on your ZKTeco terminal. Must be unique within the organization."
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
                <span>Never show on roster (attendance only)</span>
              </label>
              <p className="mt-1 pl-6 text-xs text-zinc-500">
                Managers and punch-only staff: listed in attendance, not on the shift
                roster.
              </p>
            </div>
          </>
        )}
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <div className={`flex flex-wrap items-center gap-2 ${variant === "page" ? "mt-3" : "mt-4"}`}>
        <button
          type="submit"
          disabled={pending}
          className={
            variant === "page"
              ? "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              : "rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          }
        >
          {pending ? "Saving…" : variant === "page" ? "Add" : "Add staff"}
        </button>
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
