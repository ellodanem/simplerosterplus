import type { PayFrequency, PayType } from "./countries/types";

export type ExtractPerson = {
  staffId: string;
  name: string;
  hours: number;
  vacation: string;
  sickDays: number;
  shortage: number;
};

export type DirectoryPerson = {
  staffId: string;
  name: string;
  isActive: boolean;
  isManager: boolean;
  payType: PayType;
  frequency: PayFrequency;
  /** Salaried people are auto-added only at the location of this pay run. */
  onLocation: boolean;
};

export type SelectedPerson = {
  staffId: string;
  name: string;
  fromExtract: boolean;
  reportOnly: boolean;
  hours: number;
  vacation: string;
  sickDays: number;
  shortage: number;
};

export function isReportOnlyStaffId(staffId: string): boolean {
  return staffId.startsWith("report-only:");
}

/**
 * Who is paid on this run.
 * Extract rows must match the run frequency, except report-only rows and rows
 * whose staff record is gone. Active non-manager salaried people on that
 * frequency are added even with no hours row.
 */
export function selectPeopleForRun(args: {
  frequency: PayFrequency;
  extract: ExtractPerson[];
  directory: DirectoryPerson[];
}): SelectedPerson[] {
  const byId = new Map(args.directory.map((p) => [p.staffId, p]));
  const chosen = new Map<string, SelectedPerson>();

  for (const row of args.extract) {
    const reportOnly = isReportOnlyStaffId(row.staffId);
    const person = byId.get(row.staffId);
    if (!reportOnly && person && person.frequency !== args.frequency) continue;
    const name = (person?.name || row.name || "").trim();
    if (!name) continue;
    chosen.set(row.staffId, {
      staffId: row.staffId,
      name,
      fromExtract: true,
      reportOnly: reportOnly || !person,
      hours: row.hours,
      vacation: row.vacation,
      sickDays: row.sickDays,
      shortage: row.shortage,
    });
  }

  for (const person of args.directory) {
    if (chosen.has(person.staffId)) continue;
    if (!person.onLocation || !person.isActive || person.isManager) continue;
    if (person.payType !== "salaried") continue;
    if (person.frequency !== args.frequency) continue;
    const name = person.name.trim();
    if (!name) continue;
    chosen.set(person.staffId, {
      staffId: person.staffId,
      name,
      fromExtract: false,
      reportOnly: false,
      hours: 0,
      vacation: "",
      sickDays: 0,
      shortage: 0,
    });
  }

  return [...chosen.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}
