export default function Home() {
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
            Next.js runs at the <strong>repo root</strong>. Calendar logic uses each organization&apos;s{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm">timeZone</code> (IANA), not a
            fixed region.
          </p>
        </div>
        <ul className="list-inside list-disc space-y-2 text-zinc-700">
          <li>
            Copy <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm">.env.example</code> to{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm">.env</code> and run Prisma
            migrate or db push.
          </li>
          <li>
            Product notes (timezone + multi-user roadmap): repo file{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm">docs/PRODUCT_NOTES.md</code>.
          </li>
        </ul>
        <p className="text-sm text-zinc-500">
          Staff, roster, and attendance APIs and pages are next; the Prisma schema is scoped by{" "}
          <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm">Organization</code> for future
          multi-user accounts.
        </p>
      </main>
    </div>
  );
}
