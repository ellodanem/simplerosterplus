/** Display name for pay period rows (first name preferred when set). */
export function payPeriodStaffName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  if (first) return `${first} ${last}`.trim();
  return last || "—";
}

/** Baseline roster excludes managers and punch-exempt staff. */
export function isPayPeriodManager(role: string | null, staffRoleName: string | null): boolean {
  const r = (role ?? "").trim().toLowerCase();
  const sr = (staffRoleName ?? "").trim().toLowerCase();
  if (r === "manager" || sr === "manager") return true;
  if (r.includes("manager") || sr.includes("manager")) return true;
  return false;
}

export function isPayPeriodBaselineStaff(input: {
  punchExempt: boolean;
  archivedAt: Date | null;
  role: string | null;
  staffRoleName: string | null;
}): boolean {
  if (input.punchExempt) return false;
  if (input.archivedAt) return false;
  if (isPayPeriodManager(input.role, input.staffRoleName)) return false;
  return true;
}
