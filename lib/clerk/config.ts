/** True when tenant Clerk keys are configured (self-serve auth enabled). */
export function clerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
      process.env.CLERK_SECRET_KEY?.trim(),
  );
}

export function tenantSignInPath(): string {
  return process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL?.trim() || "/sign-in";
}

export function tenantSignUpPath(): string {
  return process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL?.trim() || "/sign-up";
}
