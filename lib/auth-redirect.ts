import { redirect } from "next/navigation";
import { clerkConfigured, tenantSignInPath } from "@/lib/clerk/config";

/** Redirect unauthenticated users to the correct tenant sign-in page. */
export function redirectToSignIn(): never {
  redirect(clerkConfigured() ? tenantSignInPath() : "/login");
}
