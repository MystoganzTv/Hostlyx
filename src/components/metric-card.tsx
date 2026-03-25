import type { ReactNode } from "react";
import { formatMetricValue } from "@/lib/format";

export function MetricCard({
  label,
  value,
  format,
  helper,
  icon,
}: {
  label: string;
  value: number;
  format: "currency" | "percent" | "number";
  helper?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="card-surface rounded-[24px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {formatMetricValue(value, format)}
          </p>
        </div>
        {icon ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[var(--accent)]">
            {icon}
          </div>
        ) : null}
      </div>
      {helper ? <p className="mt-3 text-xs text-slate-500">{helper}</p> : null}
    </article>
  );
}
