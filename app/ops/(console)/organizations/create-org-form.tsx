"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TimeZoneCombobox } from "@/app/components/timezone-combobox";

const ROLE_RANK: Record<string, number> = {
  readonly: 0,
  support: 1,
  billing: 2,
  superadmin: 3,
};

function can(role: string, min: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[min] ?? 99);
}

type Handoff = {
  loginUrl: string;
  setupUrl: string;
  orgId: string;
  orgName: string;
  adminEmail: string;
  adminPassword: string;
  passwordGenerated: boolean;
};

export function CreateOrgForm({ role }: { role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [timeZone, setTimeZone] = useState("America/Toronto");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [autoPassword, setAutoPassword] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);

  const canCreate = can(role, "billing");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/organizations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timeZone,
          adminEmail,
          adminPassword: autoPassword ? undefined : adminPassword,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Handoff & { error?: string };
      if (!res.ok) {
        setError(data.error || "Failed to create organization");
        return;
      }
      setHandoff(data);
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!canCreate) return null;

  return (
    <div className="flex flex-col items-end gap-3">
      {!handoff ? (
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setError(null);
          }}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Create organization
        </button>
      ) : null}

      {handoff ? (
        <div className="w-full max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left">
          <p className="text-sm font-semibold text-emerald-900">Organization created</p>
          <p className="mt-1 text-xs text-emerald-800">
            Hand these credentials to the tester. First sign-in redirects to setup until staff,
            roles, and shift templates exist.
          </p>
          <dl className="mt-3 space-y-2 font-mono text-xs text-emerald-950">
            <div>
              <dt className="font-sans text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Organization
              </dt>
              <dd>
                {handoff.orgName}{" "}
                <span className="text-emerald-700">({handoff.orgId})</span>
              </dd>
            </div>
            <div>
              <dt className="font-sans text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Login URL
              </dt>
              <dd>
                <a href={handoff.loginUrl} className="underline hover:text-emerald-900">
                  {handoff.loginUrl}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-sans text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Admin email
              </dt>
              <dd>{handoff.adminEmail}</dd>
            </div>
            <div>
              <dt className="font-sans text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Password
                {handoff.passwordGenerated ? " (auto-generated)" : ""}
              </dt>
              <dd className="select-all">{handoff.adminPassword}</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/ops/organizations/${handoff.orgId}`}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              View org 360
            </Link>
            <button
              type="button"
              onClick={() => setHandoff(null)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              Create another
            </button>
          </div>
        </div>
      ) : null}

      {open && !handoff ? (
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-lg"
        >
          <p className="text-sm font-semibold text-zinc-900">Create organization</p>
          <p className="mt-1 text-xs text-zinc-500">
            Provisions org, default location, and one admin login. Recorded in the audit log.
          </p>

          <label className="mt-4 block text-xs font-medium text-zinc-700">
            Organization name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </label>

          <div className="mt-3">
            <TimeZoneCombobox
              id="provision-timezone"
              label="Timezone (IANA)"
              value={timeZone}
              onChange={setTimeZone}
            />
          </div>

          <label className="mt-3 block text-xs font-medium text-zinc-700">
            Admin email
            <input
              required
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </label>

          <label className="mt-3 flex items-center gap-2 text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={autoPassword}
              onChange={(e) => setAutoPassword(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Auto-generate password (shown once after create)
          </label>

          {!autoPassword ? (
            <label className="mt-2 block text-xs font-medium text-zinc-700">
              Temporary password
              <input
                required
                type="password"
                minLength={8}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none ring-emerald-500 focus:ring-2"
              />
            </label>
          ) : null}

          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {pending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
