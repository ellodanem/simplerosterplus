import Link from "next/link";

export function UnmappedPunchesBanner({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <span className="font-medium">
        {count} unmapped device punch{count === 1 ? "" : "es"}
      </span>{" "}
      need a staff match.{" "}
      <Link href="/devices" className="font-medium text-emerald-800 underline hover:text-emerald-950">
        Map device user IDs on Devices
      </Link>
      .
    </div>
  );
}
