/**
 * Fixed swatches for ShiftTemplate colors. 8 primary (always shown) and
 * 16 secondary (revealed by a "More" toggle). All values are Tailwind-derived
 * mid-tones that render readably with white text.
 */

export const PRIMARY_SWATCHES = [
  "#2563eb", // blue
  "#059669", // emerald
  "#d97706", // amber
  "#7c3aed", // violet
  "#e11d48", // rose
  "#0891b2", // cyan
  "#ea580c", // orange
  "#475569", // slate
] as const;

export const SECONDARY_SWATCHES = [
  "#1d4ed8", // blue-700
  "#047857", // emerald-700
  "#b45309", // amber-700
  "#6d28d9", // violet-700
  "#be123c", // rose-700
  "#0e7490", // cyan-700
  "#c2410c", // orange-700
  "#334155", // slate-700
  "#4f46e5", // indigo
  "#65a30d", // lime
  "#db2777", // pink
  "#9333ea", // purple
  "#0d9488", // teal
  "#ca8a04", // yellow-600
  "#dc2626", // red
  "#57534e", // stone
] as const;

export const ALL_SWATCHES = [...PRIMARY_SWATCHES, ...SECONDARY_SWATCHES];

export const DEFAULT_SHIFT_COLOR: string = PRIMARY_SWATCHES[0];

export function isAllowedSwatch(hex: string): boolean {
  return (ALL_SWATCHES as readonly string[]).includes(hex);
}
