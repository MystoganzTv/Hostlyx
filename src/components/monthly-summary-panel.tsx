import { SectionCard } from "@/components/section-card";
import { MetricCard } from "@/components/metric-card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { CurrencyCode, DashboardView, MonthlyPoint } from "@/lib/types";

function findTopMonth(months: MonthlyPoint[]) {
  return months.reduce<MonthlyPoint | null>((best, month) => {
    if (!best || month.profit > best.profit) {
      return month;
    }

    return best;
  }, null);
}

export function MonthlySummaryPanel({
  view,
  currencyCode,
}: {
  view: DashboardView;
  currencyCode: CurrencyCode;
}) {
  const monthsInView = view.monthlySummary.length;
  const topMonth = findTopMonth(view.monthlySummary);
  const averageRevenue =
    monthsInView > 0 ? view.metrics.grossRevenue / monthsInView : 0;
  const averageProfit =
    monthsInView > 0 ? view.metrics.netProfit / monthsInView : 0;

  const cards = view.mixedCurrencyMode
    ? [
        {
          label: "Months in View",
          value: monthsInView,
          format: "number" as const,
        },
        {
          label: "Bookings",
          value: view.metrics.bookingsCount,
          format: "number" as const,
        },
        {
          label: "Nights",
          value: view.metrics.nightsBooked,
          format: "number" as const,
        },
      ]
    : [
        {
          label: "Months in View",
          value: monthsInView,
          format: "number" as const,
        },
        {
          label: "Average Monthly Revenue",
          value: averageRevenue,
          format: "currency" as const,
        },
        {
          label: "Average Monthly Profit",
          value: averageProfit,
          format: "currency" as const,
        },
        {
          label: "Bookings",
          value: view.metrics.bookingsCount,
          format: "number" as const,
        },
      ];

  return (
    <div className="space-y-6">
      <div className={`grid gap-4 ${view.mixedCurrencyMode ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
        {cards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            format={card.format}
            currencyCode={currencyCode}
          />
        ))}
      </div>

      {view.mixedCurrencyMode ? (
        <SectionCard
          title="Monthly Portfolio View"
          subtitle="Select one market to see exact money values by month."
        >
          <div className="workspace-soft-card rounded-[22px] p-4 text-sm leading-6 text-[var(--workspace-muted)]">
            `All markets` mixes real currencies, so Hostlyx only shows non-monetary monthly data here until you choose one market.
          </div>
        </SectionCard>
      ) : null}

      {topMonth && !view.mixedCurrencyMode ? (
        <SectionCard
          title="Best Month"
          subtitle="Quick read on the strongest month in the current filter window."
        >
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="workspace-soft-card rounded-[22px] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                Top month
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">
                {topMonth.label}
              </p>
              <p className="mt-2 text-sm text-[var(--workspace-muted)]">
                {formatNumber(topMonth.bookings)} bookings and {formatNumber(topMonth.nights)} nights
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="workspace-soft-card rounded-[22px] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                  Revenue
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--workspace-text)]">
                  {formatCurrency(topMonth.revenue, false, currencyCode)}
                </p>
              </div>
              <div className="workspace-soft-card rounded-[22px] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                  Profit
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--workspace-text)]">
                  {formatCurrency(topMonth.profit, false, currencyCode)}
                </p>
              </div>
              <div className="workspace-soft-card rounded-[22px] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                  Payout
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--workspace-text)]">
                  {formatCurrency(topMonth.payout, false, currencyCode)}
                </p>
              </div>
              <div className="workspace-soft-card rounded-[22px] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                  Margin
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--workspace-text)]">
                  {formatPercent(topMonth.revenue > 0 ? topMonth.profit / topMonth.revenue : 0)}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Monthly Breakdown"
        subtitle="Revenue, payout, expenses, profit, bookings, and nights grouped by month."
      >
        <div className="space-y-3 md:hidden">
          {view.monthlySummary.map((month) => {
            const margin = month.revenue > 0 ? month.profit / month.revenue : 0;

            return (
              <article
                key={month.label}
                className="workspace-soft-card rounded-[22px] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--workspace-text)]">
                      {month.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                      {formatNumber(month.bookings)} bookings • {formatNumber(month.nights)} nights
                    </p>
                  </div>
                  {!view.mixedCurrencyMode ? (
                    <p className="text-sm font-semibold text-[var(--workspace-text)]">
                      {formatCurrency(month.profit, false, currencyCode)}
                    </p>
                  ) : null}
                </div>

                {view.mixedCurrencyMode ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                        Bookings
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                        {formatNumber(month.bookings)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                        Nights
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                        {formatNumber(month.nights)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                        Revenue
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                        {formatCurrency(month.revenue, false, currencyCode)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                        Payout
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                        {formatCurrency(month.payout, false, currencyCode)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                        Expenses
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                        {formatCurrency(month.expenses, false, currencyCode)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                        Margin
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                        {formatPercent(margin)}
                      </p>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
              <tr>
                <th className="pb-3 pr-4 font-medium">Month</th>
                <th className="pb-3 pr-4 font-medium">Bookings</th>
                <th className="pb-3 pr-4 font-medium">Nights</th>
                {!view.mixedCurrencyMode ? (
                  <>
                    <th className="pb-3 pr-4 font-medium">Revenue</th>
                    <th className="pb-3 pr-4 font-medium">Payout</th>
                    <th className="pb-3 pr-4 font-medium">Expenses</th>
                    <th className="pb-3 pr-4 font-medium">Profit</th>
                    <th className="pb-3 font-medium">Margin</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--workspace-border)] text-[var(--workspace-text)]">
              {view.monthlySummary.map((month) => {
                const margin = month.revenue > 0 ? month.profit / month.revenue : 0;

                return (
                  <tr key={month.label}>
                    <td className="py-4 pr-4 font-medium">{month.label}</td>
                    <td className="py-4 pr-4">{formatNumber(month.bookings)}</td>
                    <td className="py-4 pr-4">{formatNumber(month.nights)}</td>
                    {!view.mixedCurrencyMode ? (
                      <>
                        <td className="py-4 pr-4">{formatCurrency(month.revenue, false, currencyCode)}</td>
                        <td className="py-4 pr-4">{formatCurrency(month.payout, false, currencyCode)}</td>
                        <td className="py-4 pr-4">{formatCurrency(month.expenses, false, currencyCode)}</td>
                        <td className="py-4 pr-4">{formatCurrency(month.profit, false, currencyCode)}</td>
                        <td className="py-4">{formatPercent(margin)}</td>
                      </>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
