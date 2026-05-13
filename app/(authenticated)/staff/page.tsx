import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AddStaffForm } from "@/app/components/add-staff-form";

export const metadata = {
  title: "Staff | Simple Roster Plus",
};

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const staff = await prisma.staff.findMany({
    where: { organizationId: session.orgId },
    orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Staff</h1>
      <p className="mt-1 text-sm text-zinc-600">
        People in your organization. Roster and attendance will reference this list.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Device ID</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Punch exempt</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No staff yet. Add someone below or run{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">npm run db:seed</code>.
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <Link href={`/staff/${s.id}`} className="hover:underline">
                      {s.firstName} {s.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{s.email ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.role ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {s.deviceUserId ? (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700">
                        {s.deviceUserId}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{s.sortOrder}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.punchExempt ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/staff/${s.id}`}
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddStaffForm />
    </div>
  );
}
