import { Suspense } from "react";
import { OperatorLoginForm } from "./login-form";

export const metadata = {
  title: "Operator sign in | Simple Roster Plus",
};

export default function OperatorLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
          Loading…
        </div>
      }
    >
      <OperatorLoginForm />
    </Suspense>
  );
}
