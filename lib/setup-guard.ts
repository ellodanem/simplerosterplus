import { redirect } from "next/navigation";
import { getSetupCompleteness, getSetupState } from "@/lib/onboarding";

/**
 * Server-side guard: call this early in authenticated pages that assume a default location
 * exists (or other setup prereqs). If setup is incomplete, it redirects to `/setup`.
 */
export async function redirectToSetupIfIncomplete(args: {
  organizationId: string;
  nextPath?: string;
}) {
  const { organizationId, nextPath } = args;
  const state = await getSetupState(organizationId);
  const completeness = getSetupCompleteness(state);
  if (completeness.complete) return;

  const url = new URL("/setup", "http://local");
  if (nextPath) url.searchParams.set("next", nextPath);
  redirect(url.pathname + url.search);
}

