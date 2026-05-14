import Link from "next/link";
import { redirect } from "next/navigation";
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
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="font-medium text-zinc-700 hover:text-zinc-950">
              Home
            </Link>
            <Link href="/roster" className="font-medium text-emerald-800 hover:text-emerald-950">
              Roster
            </Link>
            <Link href="/attendance" className="font-medium text-emerald-800 hover:text-emerald-950">
              Attendance
            </Link>
            <Link href="/staff" className="font-medium text-emerald-800 hover:text-emerald-950">
              Staff
            </Link>
            <Link href="/devices" className="font-medium text-emerald-800 hover:text-emerald-950">
              Devices
            </Link>
          </nav>
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
