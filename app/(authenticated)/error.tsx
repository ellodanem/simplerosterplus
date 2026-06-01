"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/app/components/error-page";

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[authenticated-error]", error);
  }, [error]);

  return (
    <ErrorPage
      title="Something went wrong"
      message="This page could not be loaded. Try again or go back to your dashboard."
      homeHref="/"
      homeLabel="Back to Home"
      reset={reset}
    />
  );
}
