import { ArrowDownRight, ArrowUpRight, Landmark, Wallet } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { CurrencyCode, DashboardView } from "@/lib/types";

function averageNetCashflow(view: DashboardView) {
  const months = view.monthlySummary.length;
  return months > 0 ? view.metrics.netProfit / months : 0;
}

export function CashflowPanel({
  view,
  currencyCode,
  rangeLabel,
}: {
  view: DashboardView;
  currencyCode: CurrencyCode;
  rangeLabel: string;
}) {
  const coverageRatio =
    view.metrics.totalExpenses > 0 ? view.metrics.netPayout / view.metrics.totalExpenses : 0;

  return (
    <div className="space-y-6">
      <div className={`grid gap-4 ${view.mixedCurrencyMode ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
        <MetricCard
          label="Cash In"
          value={view.metrics.netPayout}
          format="currency"
          currencyCode={currencyCode}
          helper="Owner cash coming in from payouts"
          icon={<ArrowDownRight className="h-5 w-5" />}
        />
        <MetricCard
          label="Cash Out"
          value={view.metrics.totalExpenses}
          format="currency"
          currencyCode={currencyCode}
          helper="Expenses leaving the business"
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
        <MetricCard
          label="Net Cashflow"
          value={view.metrics.netProfit}
          format="currency"
          currencyCode={currencyCode}
          helper="Payout minus expenses in the selected range"
          icon={<Wallet className="h-5 w-5" />}
        />
        {!view.mixedCurrencyMode ? (
          <MetricCard
            label="Coverage Ratio"
            value={coverageRatio}
            format="percent"
            currencyCode={currencyCode}
            helper="How much payouts cover expense load"
            icon={<Landmark className="h-5 w-5" />}
          />
        ) : null}
      </div>

      <SectionCard
        title="Cashflow Reading"
        subtitle="Use this page to see how money moves through the business across the selected reporting window."
      >
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="workspace-soft-card rounded-[22px] p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
              Reporting window
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">{rangeLabel}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--workspace-muted)]">
              Hostlyx treats payout as cash in and expenses as cash out. This gives you a cleaner operational read than gross revenue alone.
            </p>
          </div>
          <div className="workspace-soft-card rounded-[22px] p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
              Monthly average
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">
              {formatCurrency(averageNetCashflow(view), false, currencyCode)}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--workspace-muted)]">
              Average monthly net cashflow across the months currently in view.
            </p>
          </div>
        </div>
      </SectionCard>

      {view.mixedCurrencyMode ? (
        <SectionCard
          title="Cashflow by Market"
          subtitle="All markets mode keeps each market in its real currency instead of faking one converted total."
        >
          <div className="grid gap-4 xl:grid-cols-3">
            {view.marketBreakdown.map((market) => (
              <article key={market.countryCode} className="workspace-soft-card rounded-[22px] p-4">
                <p className="text-base font-semibold text-[var(--workspace-text)]">{market.countryCode}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                  {market.currencyCode}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                      In
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                      {formatCurrency(market.payout, false, market.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                      Out
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                      {formatCurrency(market.expenses, false, market.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                      Net
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                      {formatCurrency(market.profit, false, market.currencyCode)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Monthly Cashflow"
          subtitle="Track payout in, expenses out, and resulting net cashflow month by month."
        >
          <div className="space-y-3 md:hidden">
            {view.monthlySummary.map((month) => (
              <article key={month.label} className="workspace-soft-card rounded-[22px] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--workspace-text)]">{month.label}</p>
                    <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                      {formatNumber(month.bookings)} bookings • {formatNumber(month.nights)} nights
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--workspace-text)]">
                    {formatCurrency(month.profit, false, currencyCode)}
                  </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Cash In</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                      {formatCurrency(month.payout, false, currencyCode)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Cash Out</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                      {formatCurrency(month.expenses, false, currencyCode)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Net</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                      {formatCurrency(month.profit, false, currencyCode)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Month</th>
                  <th className="pb-3 pr-4 font-medium">Cash In</th>
                  <th className="pb-3 pr-4 font-medium">Cash Out</th>
                  <th className="pb-3 pr-4 font-medium">Net</th>
                  <th className="pb-3 pr-4 font-medium">Bookings</th>
                  <th className="pb-3 font-medium">Nights</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--workspace-border)] text-[var(--workspace-text)]">
                {view.monthlySummary.map((month) => (
                  <tr key={month.label}>
                    <td className="py-4 pr-4 font-medium">{month.label}</td>
                    <td className="py-4 pr-4">{formatCurrency(month.payout, false, currencyCode)}</td>
                    <td className="py-4 pr-4">{formatCurrency(month.expenses, false, currencyCode)}</td>
                    <td className="py-4 pr-4">{formatCurrency(month.profit, false, currencyCode)}</td>
                    <td className="py-4 pr-4">{formatNumber(month.bookings)}</td>
                    <td className="py-4">{formatNumber(month.nights)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {!view.mixedCurrencyMode ? (
        <SectionCard
          title="Cash Health"
          subtitle="Quick ways to read how comfortably the selected period funded itself."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="workspace-soft-card rounded-[22px] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                Coverage
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">
                {formatPercent(coverageRatio)}
              </p>
            </div>
            <div className="workspace-soft-card rounded-[22px] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                Expense Share
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">
                {formatPercent(view.metrics.netPayout > 0 ? view.metrics.totalExpenses / view.metrics.netPayout : 0)}
              </p>
            </div>
            <div className="workspace-soft-card rounded-[22px] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                Net Margin
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">
                {formatPercent(view.metrics.profitMargin)}
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
