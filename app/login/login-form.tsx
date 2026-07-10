"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/app/components/brand-logo";

type OrgOption = { id: string; name: string };

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [orgChoices, setOrgChoices] = useState<OrgOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(organizationId ? { organizationId } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        organizations?: OrgOption[];
      };
      if (res.status === 409 && data.code === "ORG_SELECT_REQUIRED" && data.organizations) {
        setOrgChoices(data.organizations);
        if (data.organizations.length === 1) {
          setOrganizationId(data.organizations[0].id);
        }
        setError(data.error ?? "Choose your organization.");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Sign-in failed");
        return;
      }
      router.push(next.startsWith("/") ? next : "/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <BrandLogo height={32} priority className="mb-6" />
        <h1 className="text-xl font-semibold text-zinc-900">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-500">Welcome back</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-zinc-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setOrgChoices(null);
                setOrganizationId("");
              }}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </div>
          {orgChoices && orgChoices.length > 1 ? (
            <div>
              <label className="block text-sm font-medium text-zinc-700" htmlFor="organization">
                Organization
              </label>
              <select
                id="organization"
                name="organization"
                required
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
              >
                <option value="">Choose organization…</option>
                {orgChoices.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={pending || (orgChoices !== null && orgChoices.length > 1 && !organizationId)}
            className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
