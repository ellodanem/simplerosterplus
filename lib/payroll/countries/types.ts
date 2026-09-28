export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";
export type PayType = "hourly" | "salaried";
export type OvertimeRule = "none" | "daily" | "weekly";

export type CreditUnion = {
  code: string;
  /** Substrings matched against the bank name, lowercase. */
  aliases: string[];
  /** Postal address when the department has published one. Blank until then. */
  address: string;
  settlementBank: string;
  settlementAccount: string;
};

export type PayrollCountry = {
  code: string;
  name: string;
  currency: string;
  employeeNicRate: number;
  employerNicRate: number;
  /** Per calendar month, employee and employer tracked separately. */
  nicMonthlyCap: number;
  paysPerYear: Record<PayFrequency, number>;
  /** Used to turn a loan term in months into a number of pays. */
  paysPerMonth: Record<PayFrequency, number>;
  creditUnions: CreditUnion[];
};
