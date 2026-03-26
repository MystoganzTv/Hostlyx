import type { ReactNode } from "react";
import { formatMetricValue } from "@/lib/format";
import type { CurrencyCode } from "@/lib/types";

export function MetricCard({
  label,
  value,
  format,
  currencyCode,
  helper,
  icon,
}: {
  label: string;
  value: number;
  format: "currency" | "percent" | "number";
  currencyCode: CurrencyCode;
  helper?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="workspace-card rounded-[24px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted)]">{label}</p>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-[var(--workspace-text)] sm:text-3xl">
            {formatMetricValue(value, format, currencyCode)}
          </p>
        </div>
        {icon ? (
          <div className="workspace-icon-chip rounded-2xl p-3">
            {icon}
          </div>
        ) : null}
      </div>
      {helper ? <p className="mt-3 text-xs text-[var(--workspace-muted)]">{helper}</p> : null}
    </article>
  );
}
