import { notFound } from "next/navigation";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { gatePayrollPage } from "@/lib/payroll/access";
import { listStaffPay } from "@/lib/payroll/people";
import { PayrollLinks } from "../payroll-links";
import { PeopleEditor } from "./people-editor";

export const metadata = { title: "Payroll people | Simple Roster Plus" };

export default async function PayrollPeoplePage() {
  const gate = await gatePayrollPage();
  if (gate.kind === "signin") redirectToSignIn();
  if (gate.kind === "hidden") notFound();
  if (gate.kind === "unsupported") return <p className="text-sm text-zinc-700">{gate.message}</p>;

  const people = await listStaffPay(gate.access);
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">People</h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-600">
        NIC, pay, bank, and loan details stay on this page. They are not shown on the staff list.
      </p>
      <div className="mt-4">
        <PayrollLinks current="people" />
      </div>
      <PeopleEditor people={people} readOnly={gate.access.readOnly} />
    </div>
  );
}
