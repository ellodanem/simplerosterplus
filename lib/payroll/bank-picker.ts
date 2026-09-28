/** Saint Lucia bank picker. Names must match the banking-list document exactly. */

export const OTHER_BANK = "__other__";

export type BankPickerGroup = {
  label: string;
  banks: readonly string[];
};

export const SAINT_LUCIA_BANKS: readonly BankPickerGroup[] = [
  {
    label: "Commercial Banks",
    banks: [
      "1st National Bank Saint Lucia Limited",
      "Bank of Saint Lucia Ltd.",
      "CIBC Caribbean Bank Limited (formerly CIBC FirstCaribbean)",
      "Financial Investment and Consultancy Services Ltd",
      "Republic Bank (EC) Ltd.",
      "Cheque",
    ],
  },
  {
    label: "Credit Unions",
    banks: [
      "Choiseul Co-operative Credit Union",
      "Dennery Community Co-operative Credit Union",
      "Elks City of Castries Co-operative Credit Union",
      "Fond St. Jacques Co-operative Credit Union",
      "Jannou Credit Union (formerly St. Lucia Civil Service)",
      "Laborie Co-operative Credit Union",
      "Mabouya Valley Co-operative Credit Union",
      "Mon Repos Eastern Co-operative Credit Union",
      "National Farmers & General Workers",
      "Royal St. Lucia Police and Allied Services",
      "Saltibus Co-operative Credit Union",
      "Saint Lucia Hospitality Industry Workers",
      "Seventh Day Adventist Credit Union",
      "St. Lucia Teachers Co-operative Credit Union",
      "St. Lucia Workers' Credit Co-operative Society",
    ],
  },
  {
    label: "International Banks",
    banks: [
      "PROVEN Bank (Saint Lucia) Limited",
      "Bank of Saint Lucia International Limited",
      "Berkeley Bank & Trust Limited",
      "Euro Exim Bank Limited",
      "Petrus Private Bank Limited",
      "Hermes Bank Limited",
      "Arbiter Bank International (St. Lucia) Ltd.",
      "First Citizens Financial Services (St. Lucia) Limited",
      "Atlantic Financial Limited",
    ],
  },
];

const LISTED = new Set(SAINT_LUCIA_BANKS.flatMap((group) => group.banks));

export function isListedBank(name: string): boolean {
  return LISTED.has(name);
}
