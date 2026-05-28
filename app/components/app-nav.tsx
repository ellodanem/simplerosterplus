"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    </nav>
  );
}
