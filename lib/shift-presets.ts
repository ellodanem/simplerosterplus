import { PRIMARY_SWATCHES } from "@/lib/shift-colors";

export type ShiftPreset = {
  name: string;
  startTime: string;
  endTime: string;
  unpaidBreakMinutes: number;
  color: string;
};

/** Four common shifts for new orgs — covers most small-team schedules. */
export const DEFAULT_SHIFT_PRESETS: ShiftPreset[] = [
  {
    name: "Morning",
    startTime: "06:00",
    endTime: "14:00",
    unpaidBreakMinutes: 0,
    color: PRIMARY_SWATCHES[0],
  },
  {
    name: "Day",
    startTime: "09:00",
    endTime: "17:00",
    unpaidBreakMinutes: 30,
    color: PRIMARY_SWATCHES[1],
  },
  {
    name: "Evening",
    startTime: "14:00",
    endTime: "22:00",
    unpaidBreakMinutes: 0,
    color: PRIMARY_SWATCHES[2],
  },
  {
    name: "Close",
    startTime: "17:00",
    endTime: "23:00",
    unpaidBreakMinutes: 0,
    color: PRIMARY_SWATCHES[3],
  },
];

/** Half-hour slots for quick time pickers in setup (no native time spinner). */
export const COMMON_SHIFT_TIMES = [
  "05:00",
  "05:30",
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
] as const;

export function formatShiftTimeLabel(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${mStr} ${suffix}`;
}

export function shiftPresetLabel(preset: ShiftPreset): string {
  return `${preset.name} · ${formatShiftTimeLabel(preset.startTime)}–${formatShiftTimeLabel(preset.endTime)}`;
}
