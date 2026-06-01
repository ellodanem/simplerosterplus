import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-emerald-800">Simple Roster Plus</p>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900">Page not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          This page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
