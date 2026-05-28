import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/app/components/app-nav";
import { LogoutButton } from "@/app/components/logout-button";
import { getSession } from "@/lib/session";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              href="/"
              className="shrink-0 text-sm font-semibold tracking-tight text-zinc-900 hover:text-emerald-900"
            >
              Simple Roster Plus
            </Link>
            <AppNav />
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <span className="truncate max-w-[200px]" title={session.email}>
              {session.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</div>
    </div>
  );
}
