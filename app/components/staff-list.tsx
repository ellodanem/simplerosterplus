"use client";

import { useMemo, useState } from "react";
import { AddStaffForm } from "@/app/components/add-staff-form";
import { Modal } from "@/app/components/modal";
import { StaffEditForm, type StaffEditValues } from "@/app/components/staff-edit-form";

export type StaffRow = StaffEditValues;

function staffStatusLabel(s: StaffRow): string {
  if (s.isTestUser) return "Test";
  if (s.archivedAt) return "Archived";
  if (s.excludeFromRoster) return "Attendance Only";
  return "Active";
}

export function StaffList({
  staff,
  locations,
  departments,
}: {
  staff: StaffRow[];
  locations: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
}) {
  const [rows, setRows] = useState<StaffRow[]>(sortRows(staff));
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [locationFilter, setLocationFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (locationFilter && r.locationId !== locationFilter) return false;
      if (departmentFilter && r.roleId !== departmentFilter) return false;
      return true;
    });
  }, [rows, locationFilter, departmentFilter]);

  function handleSaved(next: StaffRow) {
    setRows((curr) => sortRows(curr.map((row) => (row.id === next.id ? next : row))));
    setEditing(null);
  }

  function handleDeleted(staffId: string) {
    setRows((curr) => curr.filter((row) => row.id !== staffId));
    setEditing(null);
  }

  function handleAdded(next: StaffRow) {
    setRows((curr) => sortRows([...curr, next]));
  }

  return (
    <>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add Staff
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            id="staff-filter-location"
            label="Location"
            value={locationFilter}
            onChange={setLocationFilter}
            options={[
              { value: "", label: "All locations" },
              ...locations.map((l) => ({ value: l.id, label: l.name })),
            ]}
          />
          <SelectField
            id="staff-filter-department"
            label="Department"
            value={departmentFilter}
            onChange={setDepartmentFilter}
            options={[
              { value: "", label: "All departments" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>
        <div className="text-sm text-zinc-600">
          Showing <span className="font-semibold text-zinc-900">{filteredRows.length}</span> of{" "}
          <span className="font-semibold text-zinc-900">{rows.length}</span>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Device ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Punch exempt</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  No staff yet. Use Add Staff or run{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">npm run db:seed</code>.
                </td>
              </tr>
            ) : (
              filteredRows.map((s) => (
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
                  <td className="px-4 py-3 text-zinc-600">{s.locationName ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {s.deviceUserId ? (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700">
                        {s.deviceUserId}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{staffStatusLabel(s)}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.punchExempt ? "Yes" : "No"}</td>
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
        open={adding}
        onClose={() => setAdding(false)}
        title="Add staff"
        size="xl"
      >
        <AddStaffForm
          variant="modal"
          locations={locations}
          departments={departments}
          onSuccess={handleAdded}
          onCancel={() => setAdding(false)}
        />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.firstName} ${editing.lastName}` : "Edit staff"}
        size="xl"
      >
        {editing ? (
          <StaffEditForm
            initial={editing}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </>
  );
}

function sortRows(rows: StaffRow[]): StaffRow[] {
  return [...rows].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
  });
}

function SelectField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const { id, label, value, onChange, options } = props;
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
