import Link from "next/link";
import { requireOperator } from "@/lib/ops/context";
import { BrandMark } from "@/app/components/brand-logo";
import { OpsNav } from "./ops-nav";
import { OpsLogoutButton } from "./ops-logout-button";

export const metadata = {
  title: "Operator Console | Simple Roster Plus",
};

export default async function OperatorConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Layer-2 gate (allow-list) in addition to the middleware JWT check.
  const operator = await requireOperator();

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="flex w-60 shrink-0 flex-col bg-zinc-950">
        <Link href="/ops" className="flex items-center gap-2 px-4 py-4">
          <BrandMark size={32} />
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-white">Simple Roster Plus</span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-emerald-400">
              Operator
            </span>
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <OpsNav />
        </div>
        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-zinc-200" title={operator.email}>
                {operator.email}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                {operator.role}
              </p>
              <Link
                href="/ops/account"
                className="mt-1 inline-block text-[10px] font-medium text-emerald-400 hover:text-emerald-300"
              >
                Account
              </Link>
            </div>
            <OpsLogoutButton />
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
