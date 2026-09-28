/** Cents, half away from zero. Matches the payroll spec's per-step rounding. */
export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(n) * 100)) / 100;
}

export function roundHours(n: number): number {
  return roundMoney(n);
}
