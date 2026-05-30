"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ readOnly = false }: { readOnly?: boolean }) {
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
