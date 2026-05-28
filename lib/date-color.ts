function hashString(input: string): number {
  // FNV-1a (32-bit)
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Stable, deterministic text color for a calendar YMD (`YYYY-MM-DD`).
 * Used for visually distinguishing dates/weeks at a glance.
 */
export function dateTextColorFromYmd(ymd: string): string {
  const h = hashString(ymd) % 360;
  // Tuned for readability on white/light backgrounds.
  return `hsl(${h} 70% 35%)`;
}

