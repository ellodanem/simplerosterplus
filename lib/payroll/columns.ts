import type { CustomColumnKind } from "./compute-line";

export const BUILT_IN_COLUMNS = [
  "basic",
  "overtime",
  "vacation",
  "sick",
  "extra",
  "medical",
  "paye",
  "shortage",
] as const;

export type BuiltInColumn = (typeof BUILT_IN_COLUMNS)[number];

export type ColumnLayout = {
  hiddenBuiltIn: BuiltInColumn[];
  custom: { id: string; label: string; kind: CustomColumnKind }[];
};

export const DEFAULT_COLUMN_LAYOUT: ColumnLayout = {
  hiddenBuiltIn: ["shortage"],
  custom: [],
};

function parseCustomKind(value: unknown): CustomColumnKind | null {
  if (value === "hour" || value === "money" || value === "deduction") return value;
  return null;
}

export function parseColumnLayout(raw: unknown): ColumnLayout {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_COLUMN_LAYOUT, custom: [] };
  const record = raw as { hiddenBuiltIn?: unknown; custom?: unknown };
  const hidden = Array.isArray(record.hiddenBuiltIn)
    ? record.hiddenBuiltIn.filter((item): item is BuiltInColumn =>
        BUILT_IN_COLUMNS.includes(item as BuiltInColumn),
      )
    : ["shortage" as BuiltInColumn];
  const custom = Array.isArray(record.custom)
    ? record.custom.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as { id?: unknown; label?: unknown; kind?: unknown };
        const kind = parseCustomKind(row.kind);
        const id = typeof row.id === "string" ? row.id : "";
        const label = typeof row.label === "string" ? row.label.trim() : "";
        if (!kind || !id || !label) return [];
        return [{ id, label, kind }];
      })
    : [];
  return { hiddenBuiltIn: hidden, custom };
}

export function columnVisible(layout: ColumnLayout, column: BuiltInColumn): boolean {
  return !layout.hiddenBuiltIn.includes(column);
}
