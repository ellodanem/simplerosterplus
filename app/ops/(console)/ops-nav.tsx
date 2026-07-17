"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; exact?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/ops", label: "Overview", exact: true },
  { href: "/ops/organizations", label: "Organizations" },
  { href: "/ops/onboarding", label: "Onboarding Funnel" },
  { href: "/ops/billing", label: "Billing" },
  { href: "/ops/devices", label: "Devices & Ingest" },
  { href: "/ops/audit", label: "Audit Log" },
  { href: "/ops/feedback", label: "Feedback" },
];

// Items that are part of the documented roadmap but not built yet. Shown disabled so the
// information architecture from docs/OPERATOR_CONSOLE.md is visible.
const SOON_ITEMS = ["Users", "Feature Flags"] as const;

export function OpsNav({ openFeedbackCount = 0 }: { openFeedbackCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4 text-sm" aria-label="Operator">
      {NAV_ITEMS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        const showBadge = href === "/ops/feedback" && openFeedbackCount > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={
              showBadge
                ? `${label}, ${openFeedbackCount} open`
                : undefined
            }
            className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 font-medium transition-colors ${
              active
                ? "bg-emerald-600 text-white"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <span>{label}</span>
            {showBadge ? (
              <span
                className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums ${
                  active ? "bg-white/20 text-white" : "bg-rose-500 text-white"
                }`}
              >
                {openFeedbackCount > 99 ? "99+" : openFeedbackCount}
              </span>
            ) : null}
          </Link>
        );
      })}
      <div className="mt-4 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        Roadmap
      </div>
      {SOON_ITEMS.map((label) => (
        <span
          key={label}
          className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 font-medium text-zinc-600"
          title="Planned — see docs/OPERATOR_CONSOLE.md"
        >
          {label}
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] uppercase text-zinc-500">
            soon
          </span>
        </span>
      ))}
    </nav>
  );
}
