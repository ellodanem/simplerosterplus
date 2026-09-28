import type { PayFrequency, PayrollCountry } from "./countries/types";
import { roundMoney } from "./money";

export function loanPayCount(
  country: PayrollCountry,
  frequency: PayFrequency,
  termCount: number,
  termUnit: "months" | "pays",
): number {
  const count = Math.max(0, Math.floor(termCount));
  if (termUnit === "pays") return count;
  return count * country.paysPerMonth[frequency];
}

/** Regular installment in cents-rounded dollars. Zero when the term does not yield a pay. */
export function loanInstallment(
  country: PayrollCountry,
  frequency: PayFrequency,
  principal: number,
  termCount: number,
  termUnit: "months" | "pays",
): number {
  const pays = loanPayCount(country, frequency, termCount, termUnit);
  if (pays <= 0) return 0;
  return roundMoney(Math.max(0, principal) / pays);
}

/**
 * This pay's deduction. Leftover cents under $1 ride on the last pay.
 * Cannot exceed what is still owed.
 */
export function loanDeductionThisPay(installment: number, remaining: number): number {
  const left = roundMoney(Math.max(0, remaining));
  if (left <= 0) return 0;
  const due = roundMoney(Math.max(0, installment));
  if (due <= 0) return left;
  if (left <= due) return left;
  if (roundMoney(left - due) < 1) return left;
  return due;
}
