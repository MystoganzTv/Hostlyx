"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileOutput } from "lucide-react";

export function ExportReportLink({
  className,
  target = "_blank",
  label = "Export Report",
}: {
  className: string;
  target?: "_self" | "_blank";
  label?: string;
}) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const href = query ? `/dashboard/reports/share?${query}` : "/dashboard/reports/share";

  return (
    <Link
      href={href}
      target={target}
      prefetch={false}
      className={`inline-flex items-center justify-center gap-2.5 whitespace-nowrap leading-none ${className}`}
      rel={target === "_blank" ? "noreferrer" : undefined}
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-[var(--workspace-text)]">
        <FileOutput className="h-4 w-4 shrink-0 opacity-90" />
      </span>
      <span className="translate-y-[0.5px]">{label}</span>
    </Link>
  );
}
