import Link from "next/link";

const LINKS = [
  { href: "/payroll", key: "runs", label: "Pay runs" },
  { href: "/payroll/people", key: "people", label: "People" },
  { href: "/payroll/settings", key: "settings", label: "Payroll settings" },
] as const;

export function PayrollLinks({ current }: { current: (typeof LINKS)[number]["key"] }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Payroll">
      {LINKS.map((link) => {
        const active = link.key === current;
        return (
          <Link
            key={link.key}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium ${
              active ? "bg-emerald-50 text-emerald-900" : "text-zinc-600 hover:bg-zinc-50 hover:text-emerald-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
