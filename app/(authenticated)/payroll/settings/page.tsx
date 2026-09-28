import { notFound } from "next/navigation";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { gatePayrollPage } from "@/lib/payroll/access";
import { layoutFromConfig, num } from "@/lib/payroll/parse";
import { PayrollLinks } from "../payroll-links";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Payroll settings | Simple Roster Plus" };

export default async function PayrollSettingsPage() {
  const gate = await gatePayrollPage();
  if (gate.kind === "signin") redirectToSignIn();
  if (gate.kind === "hidden") notFound();
  if (gate.kind === "unsupported") return <p className="text-sm text-zinc-700">{gate.message}</p>;

  const config = gate.access.config;
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Payroll settings</h1>
      <p className="mt-1 text-sm text-zinc-600">
        {gate.access.country.name}. These settings belong to this organization.
      </p>
      <div className="mt-4">
        <PayrollLinks current="settings" />
      </div>
      <SettingsForm
        readOnly={gate.access.readOnly}
        initial={{
          enabled: true,
          countryCode: gate.access.country.code,
          countryName: gate.access.country.name,
          overtimeRule: config.overtimeRule,
          overtimeMultiplier: num(config.overtimeMultiplier),
          legalName: config.legalName ?? "",
          addressLine: config.addressLine ?? "",
          phone: config.phone ?? "",
          glCentre: config.glCentre ?? "",
          glDepartment: config.glDepartment ?? "",
          columnLayout: layoutFromConfig(config.columnLayout),
        }}
      />
    </div>
  );
}
