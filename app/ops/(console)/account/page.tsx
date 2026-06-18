import { requireOperator } from "@/lib/ops/context";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = {
  title: "Account | Operator Console",
};

export default async function OperatorAccountPage() {
  const operator = await requireOperator("/ops/account");

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Account</h1>
      <p className="mt-1 text-sm text-zinc-600">Manage your operator console sign-in.</p>
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <dl className="grid gap-1 text-sm">
          <dt className="font-medium text-zinc-500">Email</dt>
          <dd className="text-zinc-900">{operator.email}</dd>
          <dt className="mt-3 font-medium text-zinc-500">Role</dt>
          <dd className="capitalize text-zinc-900">{operator.role}</dd>
        </dl>
        <div className="mt-8 border-t border-zinc-200 pt-8">
          <h2 className="text-sm font-semibold text-zinc-900">Change password</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Forgot your password? An existing superadmin can re-run{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">npm run provision-operator</code>{" "}
            with your email to reset it.
          </p>
          <div className="mt-4">
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
