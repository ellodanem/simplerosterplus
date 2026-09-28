import Link from "next/link";
import { notFound } from "next/navigation";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { gatePayrollPage } from "@/lib/payroll/access";
import { layoutFromConfig } from "@/lib/payroll/parse";
import { getPayRun } from "@/lib/payroll/runs";
import { RunWorkspace } from "./run-workspace";

export const metadata = { title: "Pay run | Simple Roster Plus" };

export default async function PayRunPage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await gatePayrollPage();
  if (gate.kind === "signin") redirectToSignIn();
  if (gate.kind === "hidden") notFound();
  if (gate.kind === "unsupported") return <p className="text-sm text-zinc-700">{gate.message}</p>;

  const { id } = await params;
  let run;
  try {
    run = await getPayRun(gate.access, id);
  } catch {
    return notFound();
  }

  return (
    <div>
      <Link href="/payroll" className="text-sm font-medium text-emerald-800">
        ← Payroll
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
        {run.rangeStart} – {run.rangeEnd}
      </h1>
      <div className="mt-4">
        <RunWorkspace
          initial={run}
          layout={layoutFromConfig(gate.access.config.columnLayout)}
          readOnly={gate.access.readOnly}
          orgName={gate.orgName}
        />
      </div>
    </div>
  );
}
