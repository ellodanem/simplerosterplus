import { formatYmdInZone } from "@/lib/datetime-policy";
import type { DayHours } from "./overtime";
import { roundHours } from "./money";

/** Hours per local day from in/out pairs. A pair counts on the day of the in punch. */
export function dayHoursFromPunches(
  punches: { punchAt: Date; punchType: string }[],
  timeZone: string,
): DayHours[] {
  const sorted = [...punches].sort((a, b) => a.punchAt.getTime() - b.punchAt.getTime());
  const minutes = new Map<string, number>();
  let open: Date | null = null;
  for (const punch of sorted) {
    if (punch.punchType === "in") {
      open = punch.punchAt;
      continue;
    }
    if (punch.punchType !== "out" || !open || punch.punchAt.getTime() <= open.getTime()) continue;
    const mins = Math.round((punch.punchAt.getTime() - open.getTime()) / 60_000);
    const ymd = formatYmdInZone(open, timeZone);
    minutes.set(ymd, (minutes.get(ymd) ?? 0) + mins);
    open = null;
  }
  return [...minutes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ymd, mins]) => ({ ymd, hours: roundHours(mins / 60) }));
}
