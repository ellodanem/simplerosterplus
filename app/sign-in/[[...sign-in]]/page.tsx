import { SignIn } from "@clerk/nextjs";
import { BrandLogo } from "@/app/components/brand-logo";

export default function SignInPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4 py-12">
      <BrandLogo height={32} priority className="mb-8" />
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/"
      />
    </div>
  );
}
