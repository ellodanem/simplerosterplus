import { rosterShareUrl } from "@/lib/roster-share";

const DAY_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatDayLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return DAY_FMT.format(new Date(Date.UTC(y, m - 1, d)));
}

export type ShiftTemplateLite = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

export function buildPersonalScheduleLines(input: {
  staffId: string;
  days: string[];
  entries: Record<string, string>;
  templates: Map<string, ShiftTemplateLite>;
  blockMap: Record<string, "vacation" | "dayOff">;
  holidays: Record<string, { name: string; stationClosed: boolean }>;
}): string[] {
  const lines: string[] = [];
  for (const ymd of input.days) {
    const holiday = input.holidays[ymd];
    if (holiday?.stationClosed) {
      lines.push(`${formatDayLabel(ymd)}: ${holiday.name} (closed)`);
      continue;
    }
    const block = input.blockMap[`${input.staffId}__${ymd}`];
    if (block === "vacation") {
      lines.push(`${formatDayLabel(ymd)}: Vacation`);
      continue;
    }
    if (block === "dayOff") {
      lines.push(`${formatDayLabel(ymd)}: Day off`);
      continue;
    }
    const templateId = input.entries[`${input.staffId}__${ymd}`];
    if (!templateId) continue;
    const t = input.templates.get(templateId);
    if (!t) continue;
    lines.push(`${formatDayLabel(ymd)}: ${t.name} ${t.startTime}–${t.endTime}`);
  }
  return lines;
}

export function buildPersonalScheduleBody(input: {
  staffId: string;
  days: string[];
  entries: Record<string, string>;
  templates: Map<string, ShiftTemplateLite>;
  blockMap: Record<string, "vacation" | "dayOff">;
  holidays: Record<string, { name: string; stationClosed: boolean }>;
}): string {
  const lines = buildPersonalScheduleLines(input);
  if (lines.length === 0) return "No shifts scheduled this week.";
  return lines.join("\n");
}

export function buildRosterManualWhatsAppText(input: {
  orgName: string;
  weekStartYmd: string;
  weekEndYmd: string;
  shareUrl: string;
}): string {
  return `${input.orgName} — roster for ${input.weekStartYmd} to ${input.weekEndYmd} is live.\n${input.shareUrl}`;
}

export function buildRosterShareUrl(baseUrl: string, shareToken: string): string {
  return rosterShareUrl(baseUrl, shareToken);
}

export function formatWeekRangeLabel(weekStartYmd: string, weekEndYmd: string): string {
  return `${weekStartYmd} – ${weekEndYmd}`;
}
