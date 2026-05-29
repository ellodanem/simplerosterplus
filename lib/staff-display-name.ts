/** Full name for tooltips, attendance, and admin views. */
export function formatStaffFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

/** Compact roster label, e.g. "Althea F." */
export function formatRosterStaffName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  if (!last) return first;
  return `${first} ${last[0]!.toUpperCase()}.`;
}
