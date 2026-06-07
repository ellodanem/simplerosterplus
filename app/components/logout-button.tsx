"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function ClerkSignOutButton() {
  const router = useRouter();
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      onClick={async () => {
        await signOut({ redirectUrl: "/sign-in" });
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

function LegacyLogoutButton({ readOnly }: { readOnly: boolean }) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      onClick={async () => {
        if (readOnly) {
          const res = await fetch("/api/auth/end-impersonation", { method: "POST" });
          const data = (await res.json().catch(() => ({}))) as { redirectUrl?: string };
          router.push(data.redirectUrl ?? "/ops");
        } else {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
        }
        router.refresh();
      }}
    >
      {readOnly ? "End session" : "Sign out"}
    </button>
  );
}

export function LogoutButton({ readOnly = false }: { readOnly?: boolean }) {
  if (readOnly) {
    return <LegacyLogoutButton readOnly />;
  }
  if (clerkEnabled) {
    return <ClerkSignOutButton />;
  }
  return <LegacyLogoutButton readOnly={false} />;
}
