import { SignUp } from "@clerk/nextjs";
import { BrandLogo } from "@/app/components/brand-logo";

type SearchParams = { intent?: string };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const afterSignUp = params.intent === "demo" ? "/demo/start" : "/setup";

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4 py-12">
      <BrandLogo height={32} priority className="mb-8" />
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl={afterSignUp}
      />
    </div>
  );
}
