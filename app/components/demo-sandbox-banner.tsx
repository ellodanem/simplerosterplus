import Link from "next/link";

export function DemoSandboxBanner({
  demoExpiresAt,
}: {
  demoExpiresAt: Date;
}) {
  const msLeft = demoExpiresAt.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

  return (
    <div className="border-b border-violet-200 bg-violet-50 px-4 py-2.5 text-center text-sm text-violet-950">
      <span className="font-medium">Demo sandbox</span>
      {" — "}
      {daysLeft > 0 ? (
        <>
          {daysLeft} {daysLeft === 1 ? "day" : "days"} left to explore sample data.
        </>
      ) : (
        <>This demo has expired.</>
      )}{" "}
      Ready for your site?{" "}
      <Link href="/sign-up" className="font-semibold underline underline-offset-2">
        Start Free
      </Link>
    </div>
  );
}
