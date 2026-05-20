"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/app/components/modal";
import { StaffEditForm, type StaffEditValues } from "@/app/components/staff-edit-form";

export type StaffRow = StaffEditValues;

export function StaffList({ staff }: { staff: StaffRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<StaffRow | null>(null);

  function closeAndRefresh() {
    setEditing(null);
    router.refresh();
  }

  return (
    <>
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Device ID</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Punch exempt</th>
              <th className="px-4 py-3">Roster planning</th>
              <th className="px-4 py-3">Roster grid</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                  No staff yet. Add someone below or run{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">npm run db:seed</code>.
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <button
                      type="button"
                      onClick={() => setEditing(s)}
                      className="hover:underline"
                    >
                      {s.firstName} {s.lastName}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{s.email || "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.role || "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {s.deviceUserId ? (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700">
                        {s.deviceUserId}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{s.sortOrder}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.punchExempt ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.isActive ? "Yes" : "Left"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {s.excludeFromRoster ? "Attendance only" : "Shift rows"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(s)}
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.firstName} ${editing.lastName}` : "Edit staff"}
        size="xl"
      >
        {editing ? (
          <StaffEditForm
            key={editing.id}
            initial={editing}
            onSaved={closeAndRefresh}
            onDeleted={closeAndRefresh}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </>
  );
}
