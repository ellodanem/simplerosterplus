import Link from "next/link";
import type { PlanLimitWarning } from "@/lib/plans";

export function PlanLimitBanner({ warnings }: { warnings: PlanLimitWarning[] }) {
  if (warnings.length === 0) return null;

  const top = warnings[0];
  const isWarn = top.severity === "warn";

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        isWarn
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-sky-200 bg-sky-50 text-sky-950"
      }`}
      role="status"
    >
      <p className="font-medium">Plan limit</p>
      <p className="mt-1">
        {top.message}{" "}
        <Link href="/settings" className="font-semibold underline underline-offset-2">
          View plans
        </Link>
      </p>
    </div>
  );
}

export function BillingStatusBanner({
  needsPaymentAttention,
}: {
  needsPaymentAttention: boolean;
}) {
  if (!needsPaymentAttention) return null;

  return (
    <div
      className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
      role="alert"
    >
      <p className="font-medium">Payment issue</p>
      <p className="mt-1">
        Your last payment did not go through. Update your card to keep live device sync and paid
        limits.{" "}
        <Link href="/settings" className="font-semibold underline underline-offset-2">
          Fix billing
        </Link>
      </p>
    </div>
  );
}
