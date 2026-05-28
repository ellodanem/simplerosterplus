"use client";

import { Modal } from "@/app/components/modal";
import {
  TaxonomyListManager,
  type TaxonomyItem,
} from "@/app/components/taxonomy-list-manager";
import { DEPARTMENT_PRESETS, ROLE_PRESETS } from "@/lib/role-presets";

export function ManageRolesModal({
  open,
  onClose,
  initialRoles,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  initialRoles: TaxonomyItem[];
  onChange?: (roles: TaxonomyItem[]) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Manage roles" size="lg">
      <TaxonomyListManager
        kind="role"
        apiBase="/api/roles"
        initial={initialRoles}
        presets={ROLE_PRESETS}
        onChange={onChange}
        description="Job titles used when adding staff and filtering the roster. Roles and departments are separate."
      />
    </Modal>
  );
}

export function ManageDepartmentsModal({
  open,
  onClose,
  initialDepartments,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  initialDepartments: TaxonomyItem[];
  onChange?: (departments: TaxonomyItem[]) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Manage departments" size="lg">
      <TaxonomyListManager
        kind="department"
        apiBase="/api/departments"
        initial={initialDepartments}
        presets={DEPARTMENT_PRESETS}
        onChange={onChange}
        description="Optional org-wide groups for attendance reporting (HR, Kitchen, Sales). Not the same as job role."
      />
    </Modal>
  );
}
