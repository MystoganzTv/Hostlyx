import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function MarketingFooter() {
  return (
    <footer className="mx-auto mt-10 w-full max-w-7xl px-4 pb-10 sm:px-6 xl:px-8">
      <div className="flex flex-col gap-4 border-t border-white/8 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <BrandLogo href="/" compact />
          <p className="mt-2 max-w-xl">
            Short-term rental finance software that replaces spreadsheet chaos with real financial clarity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="transition hover:text-slate-100">
            Home
          </Link>
          <Link href="/pricing" className="transition hover:text-slate-100">
            Pricing
          </Link>
          <Link href="/login" className="transition hover:text-slate-100">
            Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
