import type { CustomColumnAmount, CustomColumnKind } from "./compute-line";
import { parseColumnLayout, type ColumnLayout } from "./columns";
import type { DayHours } from "./overtime";
import type { ThirdPartyDto } from "./dto";
import { roundHours, roundMoney } from "./money";

export function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;
  if (typeof value === "object" && "toString" in value) {
    const n = Number(String(value));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function parseDayBuckets(raw: unknown): DayHours[] {
  if (!Array.isArray(raw)) return [];
  const out: DayHours[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { ymd?: unknown; hours?: unknown };
    if (typeof row.ymd !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.ymd)) continue;
    out.push({ ymd: row.ymd, hours: roundHours(Math.max(0, num(row.hours))) });
  }
  return out;
}

export function parseCustomAmounts(raw: unknown, layout: ColumnLayout): CustomColumnAmount[] {
  const incoming = new Map<string, { hours: number; amount: number }>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const row = item as { id?: unknown; hours?: unknown; amount?: unknown };
      if (typeof row.id !== "string") continue;
      incoming.set(row.id, {
        hours: roundHours(Math.max(0, num(row.hours))),
        amount: roundMoney(Math.max(0, num(row.amount))),
      });
    }
  }
  return layout.custom.map((column) => {
    const found = incoming.get(column.id);
    return {
      id: column.id,
      label: column.label,
      kind: column.kind,
      hours: found?.hours ?? 0,
      amount: found?.amount ?? 0,
    };
  });
}

export function parseThirdParty(raw: unknown): ThirdPartyDto[] {
  if (!Array.isArray(raw)) return [];
  const out: ThirdPartyDto[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; label?: unknown; amount?: unknown };
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const id = typeof row.id === "string" && row.id ? row.id : "";
    if (!label || !id) continue;
    out.push({ id, label, amount: roundMoney(Math.max(0, num(row.amount))) });
  }
  return out;
}

export function layoutFromConfig(raw: unknown): ColumnLayout {
  return parseColumnLayout(raw);
}

export function isColumnKind(value: string): value is CustomColumnKind {
  return value === "hour" || value === "money" || value === "deduction";
}
