"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AddStaffForm } from "@/app/components/add-staff-form";
import {
  ManageDepartmentsModal,
  ManageRolesModal,
} from "@/app/components/manage-taxonomy-modals";
import { Modal } from "@/app/components/modal";
import { StaffEditForm, type StaffEditValues } from "@/app/components/staff-edit-form";
import type { TaxonomyItem } from "@/app/components/taxonomy-list-manager";

export type StaffRow = StaffEditValues;

function staffStatusLabel(s: StaffRow): string {
  if (s.isTestUser) return "Test";
  if (s.archivedAt) return "Archived";
  if (s.excludeFromRoster) return "Attendance Only";
  return "Active";
}

function filterStaffRows(
  list: StaffRow[],
  locationFilter: string,
  roleFilter: string,
  departmentFilter: string,
): StaffRow[] {
  return list.filter((r) => {
    if (locationFilter && r.locationId !== locationFilter) return false;
    if (roleFilter && r.roleId !== roleFilter) return false;
    if (departmentFilter && r.departmentId !== departmentFilter) return false;
    return true;
  });
}

export function StaffList({
  staff,
  locations,
  roles: initialRoles,
  departments: initialDepartments,
}: {
  staff: StaffRow[];
  locations: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
}) {
  const [rows, setRows] = useState<StaffRow[]>(sortRows(staff));
  const [roles, setRoles] = useState(initialRoles);
  const [departments, setDepartments] = useState(initialDepartments);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [manageRoles, setManageRoles] = useState(false);
  const [manageDepartments, setManageDepartments] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [archiveExpanded, setArchiveExpanded] = useState(false);

  const roleItems: TaxonomyItem[] = useMemo(
    () =>
      roles.map((r) => ({
        id: r.id,
        name: r.name,
        sortOrder: 0,
        staffCount: rows.filter((row) => row.roleId === r.id).length,
      })),
    [roles, rows],
  );

  const departmentItems: TaxonomyItem[] = useMemo(
    () =>
      departments.map((d) => ({
        id: d.id,
        name: d.name,
        sortOrder: 0,
        staffCount: rows.filter((row) => row.departmentId === d.id).length,
      })),
    [departments, rows],
  );

  const activeRows = useMemo(() => rows.filter((r) => !r.archivedAt), [rows]);
  const archivedRows = useMemo(() => rows.filter((r) => r.archivedAt), [rows]);

  const filteredActiveRows = useMemo(
    () => filterStaffRows(activeRows, locationFilter, roleFilter, departmentFilter),
    [activeRows, locationFilter, roleFilter, departmentFilter],
  );

  const filteredArchivedRows = useMemo(
    () => filterStaffRows(archivedRows, locationFilter, roleFilter, departmentFilter),
    [archivedRows, locationFilter, roleFilter, departmentFilter],
  );

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

  function handleRolesChange(next: TaxonomyItem[]) {
    setRoles(next.map(({ id, name }) => ({ id, name })));
  }

  function handleDepartmentsChange(next: TaxonomyItem[]) {
    setDepartments(next.map(({ id, name }) => ({ id, name })));
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setManageRoles(true)}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Manage roles
        </button>
        <button
          type="button"
          onClick={() => setManageDepartments(true)}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Manage departments
        </button>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add Staff
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
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
            id="staff-filter-role"
            label="Role"
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: "", label: "All roles" },
              ...roles.map((r) => ({ value: r.id, label: r.name })),
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
          Showing <span className="font-semibold text-zinc-900">{filteredActiveRows.length}</span> of{" "}
          <span className="font-semibold text-zinc-900">{activeRows.length}</span>
        </div>
      </div>

      <div className="mt-6">
        <StaffTable
          rows={filteredActiveRows}
          emptyMessage={
          rows.length === 0
            ? emptyStaffMessage
            : activeRows.length === 0
              ? "No active staff."
              : "No staff match these filters."
        }
          onEdit={setEditing}
        />
      </div>

      {archivedRows.length > 0 ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setArchiveExpanded((open) => !open)}
            aria-expanded={archiveExpanded}
            className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            <span>Archived staff ({archivedRows.length})</span>
            <ChevronDown className={archiveExpanded ? "rotate-180" : ""} />
          </button>
          {archiveExpanded ? (
            <div className="mt-2">
              <StaffTable
                rows={filteredArchivedRows}
                emptyMessage="No archived staff match these filters."
                onEdit={setEditing}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add staff" size="xl">
        <AddStaffForm
          variant="modal"
          locations={locations}
          roles={roles}
          departments={departments}
          onRolesChange={setRoles}
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

      <ManageRolesModal
        open={manageRoles}
        onClose={() => setManageRoles(false)}
        initialRoles={roleItems}
        onChange={handleRolesChange}
      />

      <ManageDepartmentsModal
        open={manageDepartments}
        onClose={() => setManageDepartments(false)}
        initialDepartments={departmentItems}
        onChange={handleDepartmentsChange}
      />
    </>
  );
}

const emptyStaffMessage = (
  <>
    No staff yet. Use Add Staff or run{" "}
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">npm run db:seed</code>.
  </>
);

function StaffTable({
  rows,
  emptyMessage,
  onEdit,
}: {
  rows: StaffRow[];
  emptyMessage: ReactNode;
  onEdit: (row: StaffRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Device ID</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Punch exempt</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-50/80">
                <td className="px-4 py-3 font-medium text-zinc-900">
                  <button type="button" onClick={() => onEdit(s)} className="hover:underline">
                    {s.firstName} {s.lastName}
                  </button>
                </td>
                <td className="px-4 py-3 text-zinc-600">{s.email || "—"}</td>
                <td className="px-4 py-3 text-zinc-600">{s.role || "—"}</td>
                <td className="px-4 py-3 text-zinc-600">{s.departmentName || "—"}</td>
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
                    onClick={() => onEdit(s)}
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
  );
}

function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${className}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
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
          <option key={o.value || "__empty"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
