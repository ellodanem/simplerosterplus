"use client";

import { useState } from "react";
import type { CreditUnionLetter } from "@/lib/payroll/documents";
import { formatMoney } from "@/lib/payroll/format";

export function CreditUnionEditor({
  legalName,
  period,
  letters,
}: {
  legalName: string;
  period: string;
  letters: CreditUnionLetter[];
}) {
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(letters.map((letter) => [letter.code, letterText(legalName, period, letter)])),
  );

  if (letters.length === 0) {
    return <p className="text-sm">No one on this run is paid to a credit union.</p>;
  }

  return (
    <div className="space-y-8">
      {letters.map((letter) => {
        const text = texts[letter.code] ?? "";
        const mailto = `mailto:?subject=${encodeURIComponent(`${legalName} payroll ${period}`)}&body=${encodeURIComponent(text)}`;
        return (
          <article key={letter.code}>
            <h1 className="text-xl font-semibold">{letter.code}</h1>
            <p className="text-sm">
              {[letter.address, letter.settlementBank, letter.settlementAccount].filter(Boolean).join(" · ") ||
                "Address not on file"}
            </p>
            <ul className="mt-2 text-sm">
              {letter.members.map((member) => (
                <li key={member.name}>
                  {member.name}: {formatMoney(member.net)}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm font-medium">Total {formatMoney(letter.total)}</p>
            <label className="mt-3 block text-sm font-medium">
              Letter
              <textarea
                className="mt-1 min-h-40 w-full rounded-md border border-zinc-300 p-3 text-sm"
                value={text}
                onChange={(event) => setTexts({ ...texts, [letter.code]: event.target.value })}
              />
            </label>
            <a href={mailto} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-emerald-800">
              Open email
            </a>
          </article>
        );
      })}
    </div>
  );
}

function letterText(legalName: string, period: string, letter: CreditUnionLetter): string {
  const members = letter.members.map((member) => `${member.name}: ${formatMoney(member.net)}`).join("\n");
  return `${legalName}\n${period}\n\n${letter.code}\n${letter.address}\n${letter.settlementBank} ${letter.settlementAccount}\n\n${members}\n\nTotal ${formatMoney(letter.total)}`;
}
