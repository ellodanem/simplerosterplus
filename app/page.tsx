import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Simple Roster Plus
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            App shell is ready
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-zinc-600">
            Calendar logic uses each organization&apos;s{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm">timeZone</code> (IANA), not a
            fixed region.
          </p>
        </div>
        <ul className="list-inside list-disc space-y-2 text-zinc-700">
          <li>
            Copy <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm">.env.example</code> to{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm">.env</code>, set{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm">DATABASE_URL</code> and{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm">AUTH_SECRET</code>, then run{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm">npm run db:migrate</code> and{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm">npm run db:seed</code>.
          </li>
          <li>
            Product notes:{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm">docs/PRODUCT_NOTES.md</code>.
          </li>
        </ul>
        <div className="flex flex-wrap gap-3">
          {session ? (
            <>
              <Link
                href="/roster"
                className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Open roster
              </Link>
              <Link
                href="/staff"
                className="inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Manage staff
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Sign in
            </Link>
          )}
        </div>
        <p className="text-sm text-zinc-500">
          Staff, roster, and shift presets are live. Attendance comes next.
        </p>
      </main>
    </div>
  );
}
