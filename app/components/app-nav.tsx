"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Home", match: (path: string) => path === "/" },
  {
    href: "/roster",
    label: "Roster",
    match: (path: string) => path === "/roster" || path.startsWith("/roster/"),
  },
  {
    href: "/attendance",
    label: "Attendance",
    match: (path: string) => path === "/attendance" || path.startsWith("/attendance/"),
  },
  {
    href: "/staff",
    label: "Staff",
    match: (path: string) => path === "/staff" || path.startsWith("/staff/"),
  },
  {
    href: "/devices",
    label: "Devices",
    match: (path: string) => path === "/devices" || path.startsWith("/devices/"),
  },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cached = sessionStorage.getItem("srp_setup_incomplete");
        if (cached === "0" || cached === "1") {
          if (!cancelled) setNeedsSetup(cached === "1");
          return;
        }

        const res = await fetch("/api/setup/state");
        const body = (await res.json().catch(() => ({}))) as {
          completeness?: { complete?: boolean };
        };
        const incomplete = !(body.completeness?.complete === true);
        sessionStorage.setItem("srp_setup_incomplete", incomplete ? "1" : "0");
        if (!cancelled) setNeedsSetup(incomplete);
      } catch {
        // If we can't determine, hide the link (avoid noisy UI).
        if (!cancelled) setNeedsSetup(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Main">
      {NAV_ITEMS.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-md px-3 py-1.5 font-medium transition-colors ${
              active
                ? "border-l-[3px] border-emerald-700 bg-emerald-50 pl-2.5 text-emerald-900"
                : "border-l-[3px] border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-emerald-800"
            }`}
          >
            {label}
          </Link>
        );
      })}
      {needsSetup ? (
        <Link
          href="/setup"
          aria-current={pathname === "/setup" ? "page" : undefined}
          className={`relative ml-1 rounded-md px-3 py-1.5 font-semibold transition-colors ${
            pathname === "/setup"
              ? "border-l-[3px] border-emerald-700 bg-emerald-50 pl-2.5 text-emerald-900"
              : "border-l-[3px] border-transparent bg-amber-50 text-amber-900 hover:bg-amber-100"
          }`}
          title="Finish setup to unlock the app"
        >
          Resume setup
          <span className="ml-2 inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
            Setup
          </span>
        </Link>
      ) : null}
    </nav>
  );
}
