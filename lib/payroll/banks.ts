import type { CreditUnion, PayrollCountry } from "./countries/types";

export type BankPlacement = {
  code: string;
  bucket: string;
  creditUnion: CreditUnion | null;
};

function letters12(name: string): string {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "");
  return (letters || "OTHER").slice(0, 12);
}

function findUnion(country: PayrollCountry, name: string): CreditUnion | null {
  const n = name.toLowerCase();
  for (const union of country.creditUnions) {
    if (n.includes(union.code.toLowerCase())) return union;
    if (union.aliases.some((alias) => alias && n.includes(alias))) return union;
  }
  return null;
}

/** Banking-list code and totals bucket from a bank name and account. */
export function placeBank(
  country: PayrollCountry,
  bankName: string | null | undefined,
  account: string | null | undefined,
): BankPlacement {
  const name = (bankName ?? "").trim();
  const n = name.toLowerCase();
  const hasAccount = Boolean((account ?? "").trim());

  if (/cheque|check/.test(n) || (!name && !hasAccount)) {
    return { code: "CHQ", bucket: "Cheques", creditUnion: null };
  }
  if (n.includes("bank of saint lucia")) {
    return { code: "BOSL", bucket: "BOSL S/Station", creditUnion: null };
  }
  if (n.includes("cibc") || n.includes("firstcaribbean") || n.includes("fcib")) {
    return { code: "FCIB", bucket: "CIBC S/Station", creditUnion: null };
  }
  if (n.includes("fics") || n.includes("financial investment")) {
    return { code: "FICS", bucket: "CIBC S/Station", creditUnion: null };
  }
  if (n.includes("republic")) {
    return { code: "REPUBLIC", bucket: "Republic S/Station", creditUnion: null };
  }

  const known = findUnion(country, name);
  if (known) return { code: known.code, bucket: known.code, creditUnion: known };

  if (n.includes("credit union") || n.includes("creditunion")) {
    const code = letters12(name);
    return { code, bucket: code, creditUnion: null };
  }

  const code = letters12(name);
  return { code, bucket: `${code} S/Station`, creditUnion: null };
}
