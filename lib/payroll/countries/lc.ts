import type { PayrollCountry } from "./types";

/**
 * St. Lucia payroll rules from the SRP behavior spec.
 * NIC is 5% each side, capped at $250 per calendar month on the pay date.
 * PAYE is not in this profile: it is a typed deduction until a tax table is adopted.
 */
export const SAINT_LUCIA: PayrollCountry = {
  code: "LC",
  name: "Saint Lucia",
  currency: "XCD",
  employeeNicRate: 0.05,
  employerNicRate: 0.05,
  nicMonthlyCap: 250,
  paysPerYear: {
    weekly: 52,
    biweekly: 26,
    semimonthly: 24,
    monthly: 12,
  },
  paysPerMonth: {
    weekly: 4,
    biweekly: 2,
    semimonthly: 2,
    monthly: 1,
  },
  creditUnions: [
    { code: "NFGWCCU", aliases: ["nfgwccu", "national farmers"], address: "", settlementBank: "Bank of Saint Lucia", settlementAccount: "412102733" },
    { code: "CHOISEUL", aliases: ["choiseul"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "DENNERY", aliases: ["dennery"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "ELKS", aliases: ["elks"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "FONDSTJ", aliases: ["fondstj", "fond st jacques", "fond st. jacques"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "JANNOU", aliases: ["jannou"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "LABORIE", aliases: ["laborie"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "MABOUYA", aliases: ["mabouya"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "MONREPOS", aliases: ["mon repos", "monrepos"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "POLICE", aliases: ["police credit"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "SALTIBUS", aliases: ["saltibus"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "HOSPITALITY", aliases: ["hospitality"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "SDA", aliases: ["sda credit", "seventh day"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "TEACHERS", aliases: ["teachers"], address: "", settlementBank: "", settlementAccount: "" },
    { code: "WORKERS", aliases: ["workers credit", "workers'"], address: "", settlementBank: "", settlementAccount: "" },
  ],
};
