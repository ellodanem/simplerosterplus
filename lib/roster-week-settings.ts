import { prisma } from "@/lib/prisma";

/** `AppSetting` key: which weekday begins the roster week (0 = Sunday … 6 = Saturday). */
export const ROSTER_WEEK_START_WEEKDAY_KEY = "roster_week_start_weekday";

/** Default: Monday (common for payroll / ISO-style planning). */
export const ROSTER_WEEK_START_WEEKDAY_DEFAULT = 1;

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export function weekStartWeekdayLabel(weekday: number): string {
  return WEEKDAY_OPTIONS.find((o) => o.value === weekday)?.label ?? "Monday";
}

export function parseWeekStartWeekday(value: string | null | undefined): number {
  if (value == null || value === "") return ROSTER_WEEK_START_WEEKDAY_DEFAULT;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 6) return ROSTER_WEEK_START_WEEKDAY_DEFAULT;
  return n;
}

export async function getRosterWeekStartWeekday(organizationId: string): Promise<number> {
  const row = await prisma.appSetting.findUnique({
    where: {
      organizationId_key: {
        organizationId,
        key: ROSTER_WEEK_START_WEEKDAY_KEY,
      },
    },
    select: { value: true },
  });
  return parseWeekStartWeekday(row?.value);
}
