import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TemplatesManager } from "./templates-manager";

export const metadata = {
  title: "Shift presets | Simple Roster Plus",
};

export default async function ShiftTemplatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const templates = await prisma.shiftTemplate.findMany({
    where: { organizationId: session.orgId },
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, startTime: true, endTime: true, color: true },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            <Link href="/roster" className="hover:underline">
              ← Roster
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            Shift presets
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Named shifts you assign to staff in the roster grid.
          </p>
        </div>
      </div>

      <TemplatesManager initial={templates} />
    </div>
  );
}
