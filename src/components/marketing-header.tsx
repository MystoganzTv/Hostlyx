import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

function navLinkClassName(active: boolean) {
  return active
    ? "text-slate-100"
    : "text-slate-400 transition hover:text-slate-100";
}

export function MarketingHeader({
  activePage,
  signedIn,
}: {
  activePage: "home" | "pricing" | "showcase";
  signedIn: boolean;
}) {
  return (
    <header className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 xl:px-8">
      <div className="marketing-shell flex flex-col gap-4 rounded-[28px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <BrandLogo href="/" showTagline />
          <span className="hidden text-sm text-slate-400 lg:inline">
            The financial operating system for short-term rental hosts
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/" className={navLinkClassName(activePage === "home")}>
              Home
            </Link>
            <Link href="/pricing" className={navLinkClassName(activePage === "pricing")}>
              Pricing
            </Link>
            <Link href="/showcase" className={navLinkClassName(activePage === "showcase")}>
              Showcase
            </Link>
          </nav>

          <Link
            href={signedIn ? "/dashboard" : "/login"}
            className="brand-button rounded-2xl px-4 py-3 text-sm font-semibold transition"
          >
            {signedIn ? "Open dashboard" : "Sign in"}
          </Link>
        </div>
      </div>
    </header>
  );
}
