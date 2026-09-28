export type GlSide = { label: string; amount: number };

const EARNING_FOLDS: { test: RegExp; label: string }[] = [
  { test: /^commission$/i, label: "Commission" },
  { test: /^add(itional)? duties$/i, label: "Add duties" },
];

const DEDUCTION_FOLDS: { test: RegExp; label: string }[] = [
  { test: /^paye( tax)?$/i, label: "P.A.Y.E." },
  { test: /^(n\.?i\.?c\.?|n\.?i\.?s\.?|nic|nis)$/i, label: "N.I.S." },
  { test: /^staff loan$/i, label: "Staff Loan" },
  { test: /^cared( loan)?$/i, label: "CARED Loan" },
  { test: /^medical( insurance)?$/i, label: "Medical Insurance" },
  { test: /^republic( bank)?$/i, label: "Republic Bank" },
  { test: /^shortage$/i, label: "Shortage" },
];

export function foldEarningLabel(label: string): string {
  const name = label.trim();
  for (const fold of EARNING_FOLDS) {
    if (fold.test.test(name)) return fold.label;
  }
  return name || "Extra";
}

export function foldDeductionLabel(label: string): string {
  const name = label.trim();
  for (const fold of DEDUCTION_FOLDS) {
    if (fold.test.test(name)) return fold.label;
  }
  return name || "Other";
}

export function addGlAmount(rows: GlSide[], label: string, amount: number) {
  if (!amount) return;
  const found = rows.find((row) => row.label === label);
  if (found) found.amount = Math.round((found.amount + amount) * 100) / 100;
  else rows.push({ label, amount: Math.round(amount * 100) / 100 });
}
