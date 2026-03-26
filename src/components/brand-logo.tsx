import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  showTagline?: boolean;
  compact?: boolean;
};

export function BrandLogo({
  href,
  showTagline = false,
  compact = false,
}: BrandLogoProps) {
  const content = (
    <div className="flex items-center gap-3">
      <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--accent-soft-strong)] bg-[linear-gradient(180deg,rgba(201,168,107,0.28)_0%,rgba(201,168,107,0.12)_100%)] shadow-[0_14px_30px_rgba(7,17,28,0.32)]">
        <span className="absolute inset-[1px] rounded-[15px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_48%),linear-gradient(180deg,rgba(7,17,28,0.18)_0%,rgba(7,17,28,0.42)_100%)]" />
        <span className="relative text-base font-semibold tracking-[-0.06em] text-[var(--accent-text)]">
          H<span className="ml-[1px] text-[0.92em] text-white/82">x</span>
        </span>
      </span>

      <span className="min-w-0">
        <span className={`${compact ? "text-base" : "text-lg"} block font-semibold tracking-[-0.04em] text-slate-100`}>
          Hostlyx
        </span>
        {showTagline ? (
          <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Finance OS for rental hosts
          </span>
        ) : null}
      </span>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}
