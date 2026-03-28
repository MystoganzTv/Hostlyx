import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const legalLinks = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund", label: "Refund Policy" },
  { href: "/contact", label: "Contact" },
];

export function MarketingFooter() {
  return (
    <footer className="mx-auto mt-10 w-full max-w-7xl px-4 pb-10 sm:px-6 xl:px-8">
      <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,23,39,0.66)_0%,rgba(8,17,28,0.5)_100%)] px-5 py-8 shadow-[0_18px_42px_rgba(3,8,16,0.14)] sm:px-7">
        <div className="flex flex-col gap-8 text-sm text-slate-400 lg:flex-row lg:items-end lg:justify-between">
          <div>
          <BrandLogo href="/" compact />
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
              Short-term rental finance software that replaces spreadsheet chaos with real financial clarity.
            </p>
          </div>

          <div className="space-y-3 lg:max-w-[520px] lg:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Legal & Contact
            </p>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-[var(--accent-soft-strong)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-text)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
