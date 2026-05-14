/**
 * Tiny circular avatar — initials on a deterministic colored background. Same staff member
 * gets the same color across every surface (log row, week grid, sidebar) which makes the
 * eye skim faster than name-as-text alone, without any photo-upload infrastructure.
 *
 * Colors deliberately avoid emerald/amber/rose/violet, which are reserved for status pills
 * elsewhere in the app — keeps the visual vocabulary unambiguous.
 */

const AVATAR_PALETTE = [
  "#0e7490", // cyan-700
  "#1d4ed8", // blue-700
  "#6d28d9", // purple-700 (separated from violet status pill by hue)
  "#a21caf", // fuchsia-700
  "#be185d", // pink-700
  "#b45309", // amber-700 dark (distinct from late-amber)
  "#15803d", // green-700 dark (distinct from present-emerald)
  "#0f766e", // teal-700
  "#52525b", // zinc-600
  "#9f1239", // rose-800 dark (distinct from absent-rose)
];

/** djb2-ish hash → palette index. Stable across processes and locales. */
function paletteIndex(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  }
  return h % AVATAR_PALETTE.length;
}

export type AvatarSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
};

export function StaffAvatar({
  firstName,
  lastName,
  size = "md",
  title,
}: {
  firstName: string;
  lastName: string;
  size?: AvatarSize;
  title?: string;
}) {
  const initials = `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase();
  const bg = AVATAR_PALETTE[paletteIndex(`${firstName} ${lastName}`)];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${SIZE_CLASS[size]}`}
      style={{ background: bg }}
      aria-hidden="true"
      title={title}
    >
      {initials || "?"}
    </span>
  );
}
