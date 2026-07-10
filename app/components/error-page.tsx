"use client";

import Link from "next/link";
import { BrandLogo } from "@/app/components/brand-logo";

type ErrorPageProps = {
  title: string;
  message: string;
  homeHref: string;
  homeLabel: string;
  reset?: () => void;
};

export function ErrorPage({ title, message, homeHref, homeLabel, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <BrandLogo height={28} />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">{message}</p>
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          {reset ? (
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Try again
            </button>
          ) : null}
          <Link
            href={homeHref}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
