"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
      className={className}
      rel={target === "_blank" ? "noreferrer" : undefined}
    >
      {label}
    </Link>
  );
}
