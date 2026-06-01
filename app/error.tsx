"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/app/components/error-page";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <ErrorPage
      title="Something went wrong"
      message="We hit an unexpected problem. You can try again or return to sign in."
      homeHref="/login"
      homeLabel="Back to sign in"
      reset={reset}
    />
  );
}
