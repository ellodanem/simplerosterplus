import { formatRosterStaffName } from "@/lib/staff-display-name";
import { dayHeaderLabelCompact } from "@/lib/roster-week";
import type { RosterShareViewData } from "@/lib/roster-share-data";

const FALLBACK_COLOR = "#475569";

type Template = RosterShareViewData["templates"][number];

function cellKey(staffId: string, ymd: string): string {
  return `${staffId}__${ymd}`;
}

function blockedReason(
  staffId: string,
  ymd: string,
  holidays: RosterShareViewData["holidays"],
  blockMap: RosterShareViewData["blockMap"],
): "holiday" | "vacation" | "dayOff" | null {
  const h = holidays[ymd];
  if (h?.stationClosed) return "holiday";
  const leave = blockMap[`${staffId}__${ymd}`];
  if (leave) return leave;
  return null;
}

function ReadOnlyCell({
  tpl,
  blocked,
  holidayName,
}: {
  tpl: Template | undefined;
  blocked: "holiday" | "vacation" | "dayOff" | null;
  holidayName: string | null;
}) {
  if (blocked) {
    const label =
      blocked === "holiday" ? "Closed" : blocked === "vacation" ? "Vacation" : "Day off";
    return (
      <div className="roster-share-cell flex h-14 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-[repeating-linear-gradient(45deg,_#f4f4f5_0,_#f4f4f5_6px,_#fafafa_6px,_#fafafa_12px)] px-1 text-center text-xs font-medium text-zinc-500">
        {holidayName ? (
          <span className="truncate text-[10px] font-medium leading-tight text-violet-700">
            {holidayName}
          </span>
        ) : null}
        {label}
      </div>
    );
  }
  if (!tpl) {
    return (
      <div className="roster-share-cell flex h-14 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-1 text-center text-sm text-zinc-400">
        {holidayName ? (
          <span className="truncate text-[10px] font-medium leading-tight text-violet-700">
            {holidayName}
          </span>
        ) : null}
        Off
      </div>
    );
  }
  return (
    <div
      className="roster-share-cell flex h-14 flex-col items-center justify-center rounded-lg px-1 text-center text-xs font-semibold text-white shadow-sm"
      style={{ background: tpl.color || FALLBACK_COLOR }}
      title={`${tpl.name} · ${tpl.startTime}–${tpl.endTime}`}
    >
      <span className="truncate leading-tight">{tpl.name}</span>
      <span className="text-[10px] font-normal opacity-90">
        {tpl.startTime}–{tpl.endTime}
      </span>
    </div>
  );
}

export function RosterShareTable({
  data,
  todayYmd,
  showShiftCountBadges = false,
  maxStaffRows,
}: {
  data: RosterShareViewData;
  todayYmd?: string;
  /** Colored per-template count badges (manager roster grid style). */
  showShiftCountBadges?: boolean;
  /** Limit rendered staff rows; day counts still use the full staff list. */
  maxStaffRows?: number;
}) {
  const templateById = new Map(data.templates.map((t) => [t.id, t]));
  const staffRows =
    maxStaffRows != null ? data.staff.slice(0, maxStaffRows) : data.staff;

  const dayCounts: Record<
    string,
    { offCount: number; isClosed: boolean; templateCounts: Map<string, number> }
  > = {};
  for (const ymd of data.days) {
    const isClosed = !!data.holidays[ymd]?.stationClosed;
    let assigned = 0;
    let unavailable = 0;
    const templateCounts = new Map<string, number>();
    if (!isClosed) {
      for (const s of data.staff) {
        if (data.blockMap[`${s.id}__${ymd}`]) {
          unavailable++;
          continue;
        }
        const tplId = data.entries[cellKey(s.id, ymd)];
        if (tplId) {
          assigned++;
          templateCounts.set(tplId, (templateCounts.get(tplId) ?? 0) + 1);
        }
      }
    }
    const active = isClosed ? 0 : data.staff.length - unavailable;
    dayCounts[ymd] = {
      offCount: Math.max(0, active - assigned),
      isClosed,
      templateCounts,
    };
  }

  return (
    <div className="roster-share-table-wrap overflow-x-auto rounded-xl border border-zinc-200 bg-white print:overflow-visible">
      <table className="roster-share-table w-full min-w-[58rem] table-fixed border-collapse text-sm print:min-w-0">
        <colgroup>
          <col style={{ width: "10rem" }} />
          {data.days.map((d) => (
            <col key={d} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="sticky left-0 z-10 min-w-[10rem] border-r border-zinc-200 bg-zinc-50 px-3 py-3 text-left print:static">
              Staff
            </th>
            {data.days.map((d) => {
              const h = dayHeaderLabelCompact(d, data.timeZone);
              const isToday = todayYmd ? d === todayYmd : false;
              return (
                <th
                  key={d}
                  aria-current={isToday ? "date" : undefined}
                  className={`min-w-[7rem] px-2 py-2 text-left ${isToday ? "bg-emerald-50 text-emerald-900" : ""}`}
                >
                  <div className="font-semibold">{h.weekday}</div>
                  <div className="font-normal normal-case text-zinc-600">{h.date}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.staff.length === 0 ? (
            <tr>
              <td colSpan={1 + data.days.length} className="px-4 py-8 text-center text-zinc-500">
                No staff on this roster.
              </td>
            </tr>
          ) : (
            <>
              <tr className="bg-zinc-50">
                <td className="sticky left-0 z-10 border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 print:static">
                  Count
                </td>
                {data.days.map((d) => {
                  const c = dayCounts[d]!;
                  const isToday = todayYmd ? d === todayYmd : false;
                  if (c.isClosed) {
                    return (
                      <td
                        key={d}
                        className={`bg-zinc-100 px-2 py-2 text-center text-xs text-zinc-400 ${isToday ? "bg-zinc-100" : ""}`}
                      >
                        —
                      </td>
                    );
                  }
                  if (showShiftCountBadges) {
                    const items = Array.from(c.templateCounts.entries())
                      .map(([tplId, count]) => ({
                        template: templateById.get(tplId),
                        count,
                      }))
                      .filter((x): x is { template: Template; count: number } => !!x.template)
                      .sort((a, b) => a.template.name.localeCompare(b.template.name));
                    return (
                      <td
                        key={d}
                        className={`px-2 py-2 align-middle ${isToday ? "bg-emerald-50" : ""}`}
                      >
                        <div className="flex flex-wrap items-center gap-1">
                          {items.map(({ template, count }) => (
                            <span
                              key={template.id}
                              title={`${template.name}: ${count}`}
                              className="inline-flex size-5 items-center justify-center rounded text-[10px] font-bold text-white shadow-sm"
                              style={{ background: template.color || FALLBACK_COLOR }}
                            >
                              {count}
                            </span>
                          ))}
                          {c.offCount > 0 ? (
                            <span className="text-[11px] font-medium text-zinc-500">
                              Off: {c.offCount}
                            </span>
                          ) : null}
                          {items.length === 0 && c.offCount === 0 ? (
                            <span className="text-[11px] text-zinc-400">—</span>
                          ) : null}
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={d}
                      className={`px-2 py-2 text-center text-xs text-zinc-600 ${isToday ? "bg-emerald-50" : ""}`}
                    >
                      {c.offCount > 0 ? `Off: ${c.offCount}` : "—"}
                    </td>
                  );
                })}
              </tr>
              {staffRows.map((s) => (
                <tr key={s.id} className="border-t border-zinc-100">
                  <td className="sticky left-0 z-10 border-r border-zinc-200 bg-white px-3 py-2 print:static">
                    <div className="truncate font-semibold text-zinc-900">
                      {formatRosterStaffName(s.firstName, s.lastName)}
                    </div>
                    {s.role ? (
                      <div className="truncate text-xs text-zinc-500">{s.role}</div>
                    ) : null}
                  </td>
                  {data.days.map((d) => {
                    const templateId = data.entries[cellKey(s.id, d)];
                    const tpl = templateId ? templateById.get(templateId) : undefined;
                    const blocked = blockedReason(s.id, d, data.holidays, data.blockMap);
                    return (
                      <td key={d} className="p-1 align-top">
                        <ReadOnlyCell
                          tpl={tpl}
                          blocked={blocked}
                          holidayName={data.holidays[d]?.name ?? null}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
