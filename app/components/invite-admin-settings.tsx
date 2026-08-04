"use client";

import { useState } from "react";
import type {
  AdminInviteSnapshot,
  AdminMemberSummary,
  PendingInviteSummary,
} from "@/lib/clerk/invite-admin";

function roleLabel(role: string): string {
  if (role === "owner") return "Owner";
  if (role === "admin" || role === "org:admin") return "Admin";
  return role.replace(/^org:/, "");
}

export function InviteAdminSettings({ initial }: { initial: AdminInviteSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function applySnapshot(next: AdminInviteSnapshot) {
    setSnapshot(next);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as AdminInviteSnapshot & {
        error?: string;
        upgradeCta?: string;
        invitation?: PendingInviteSummary;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not send invitation.");
        return;
      }
      applySnapshot(data);
      setEmail("");
      setSuccess(`Invitation sent to ${data.invitation?.email ?? "them"}.`);
    } catch {
      setError("Could not send invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(invitationId: string) {
    setRevokingId(invitationId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/settings/admins/invitations/${invitationId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as AdminInviteSnapshot & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not revoke invitation.");
        return;
      }
      applySnapshot(data);
      setSuccess("Invitation revoked.");
    } catch {
      setError("Could not revoke invitation.");
    } finally {
      setRevokingId(null);
    }
  }

  const { seats, members, pendingInvites, canInvite, cannotInviteReason, planLimit } =
    snapshot;

  return (
    <div className="mt-4 space-y-5">
      <p className="text-sm text-zinc-600">
        {seats.allowed !== null ? (
          <>
            <span className="font-medium text-zinc-900">
              {seats.reserved} / {seats.allowed}
            </span>{" "}
            admin seats used
            {seats.pending > 0 ? (
              <span className="text-zinc-500">
                {" "}
                ({seats.used} active
                {seats.pending > 0 ? `, ${seats.pending} pending` : ""})
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span className="font-medium text-zinc-900">{seats.used}</span> admin login
            {seats.used === 1 ? "" : "s"}
            {seats.pending > 0 ? (
              <span className="text-zinc-500"> · {seats.pending} pending invite</span>
            ) : null}
          </>
        )}
      </p>

      <div>
        <h3 className="text-sm font-medium text-zinc-900">People with access</h3>
        <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          {members.map((m: AdminMemberSummary) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
            >
              <span className="min-w-0 truncate text-zinc-800">
                {m.email}
                {m.isYou ? (
                  <span className="ml-1.5 text-zinc-500">(you)</span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {roleLabel(m.role)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {pendingInvites.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-zinc-900">Pending invitations</h3>
          <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {pendingInvites.map((inv: PendingInviteSummary) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate text-zinc-800">{inv.email}</span>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline disabled:opacity-50"
                  disabled={revokingId === inv.id}
                  onClick={() => void revokeInvite(inv.id)}
                >
                  {revokingId === inv.id ? "Revoking…" : "Revoke"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canInvite ? (
        <form onSubmit={(e) => void sendInvite(e)} className="space-y-3">
          <label className="block text-sm font-medium text-zinc-900" htmlFor="invite-admin-email">
            Invite an admin
          </label>
          <p className="text-sm text-zinc-600">
            They get full access to manage this roster — schedules, attendance, and settings.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="invite-admin-email"
              type="email"
              required
              autoComplete="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="shrink-0 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send invite"}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
          {planLimit ? (
            <>
              <p>{planLimit.message}</p>
              {planLimit.upgradeCta ? (
                <p className="mt-1 text-zinc-600">
                  Use <span className="font-medium text-zinc-800">Billing</span> above to{" "}
                  {planLimit.upgradeCta.toLowerCase()}.
                </p>
              ) : null}
            </>
          ) : (
            <p>{cannotInviteReason ?? "Invites are not available right now."}</p>
          )}
        </div>
      )}

      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
