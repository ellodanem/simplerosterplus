import { SAINT_LUCIA } from "./lc";
import type { PayrollCountry } from "./types";

const PROFILES: Record<string, PayrollCountry> = {
  LC: SAINT_LUCIA,
};

/** Null when that country has no payroll profile yet. */
export function getPayrollCountry(code: string | null | undefined): PayrollCountry | null {
  if (!code) return null;
  return PROFILES[code.trim().toUpperCase()] ?? null;
}

export function payrollCountryCodes(): string[] {
  return Object.keys(PROFILES);
}
