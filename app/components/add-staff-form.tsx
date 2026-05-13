"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddStaffForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [deviceUserId, setDeviceUserId] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [startDate, setStartDate] = useState("");
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
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4"
    >
      <h2 className="text-sm font-semibold text-zinc-800">Add staff</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field id="nf" label="First name" required value={firstName} onChange={setFirstName} />
        <Field id="nl" label="Last name" required value={lastName} onChange={setLastName} />
        <Field id="ne" label="Email" type="email" value={email} onChange={setEmail} />
        <Field id="nr" label="Role" required value={role} onChange={setRole} />
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
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add"}
      </button>
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
