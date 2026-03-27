import { BarChart3, CalendarDays, House, Percent, TrendingUp, Users } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { CurrencyCode, DashboardView } from "@/lib/types";

function topChannel(view: DashboardView) {
  return view.revenueByChannel[0] ?? null;
}

function bestMonth(view: DashboardView) {
  return [...view.monthlySummary].sort((left, right) => right.revenue - left.revenue)[0] ?? null;
}

export function PerformancePanel({
  view,
  currencyCode,
  rangeLabel,
}: {
  view: DashboardView;
  currencyCode: CurrencyCode;
  rangeLabel: string;
}) {
  const leadingChannel = topChannel(view);
  const strongestMonth = bestMonth(view);

  return (
    <div className="space-y-6">
      <div className={`grid gap-4 ${view.mixedCurrencyMode ? "md:grid-cols-3 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-5"}`}>
        <MetricCard
          label="Bookings"
          value={view.metrics.bookingsCount}
          format="number"
          currencyCode={currencyCode}
          helper="Confirmed stays in the current filter window"
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <MetricCard
          label="Guests"
          value={view.metrics.guestsCount}
          format="number"
          currencyCode={currencyCode}
          helper="Total guest count across saved bookings"
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          label="Nights"
          value={view.metrics.nightsBooked}
          format="number"
          currencyCode={currencyCode}
          helper="Booked nights captured in Hostlyx"
          icon={<House className="h-5 w-5" />}
        />
        <MetricCard
          label="Occupancy"
          value={view.metrics.occupancyRate}
          format="percent"
          currencyCode={currencyCode}
          helper="Booked nights versus the visible calendar window"
          icon={<Percent className="h-5 w-5" />}
        />
        {!view.mixedCurrencyMode ? (
          <MetricCard
            label="ADR"
            value={view.metrics.adr}
            format="currency"
            currencyCode={currencyCode}
            helper="Average rental revenue per booked night"
            icon={<BarChart3 className="h-5 w-5" />}
          />
        ) : null}
      </div>

      {!view.mixedCurrencyMode ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <MetricCard
            label="RevPAR"
            value={view.metrics.revPar}
            format="currency"
            currencyCode={currencyCode}
            helper="Rental revenue spread across all visible nights"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <MetricCard
            label="Profit Margin"
            value={view.metrics.profitMargin}
            format="percent"
            currencyCode={currencyCode}
            helper="Net profit versus gross revenue"
            icon={<Percent className="h-5 w-5" />}
          />
          <MetricCard
            label="Revenue per Booking"
            value={view.metrics.bookingsCount > 0 ? view.metrics.grossRevenue / view.metrics.bookingsCount : 0}
            format="currency"
            currencyCode={currencyCode}
            helper="Average total revenue generated per stay"
            icon={<BarChart3 className="h-5 w-5" />}
          />
        </div>
      ) : null}

      <SectionCard
        title="Performance Read"
        subtitle="Use this page for demand quality, rate quality, and overall booking efficiency."
      >
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="workspace-soft-card rounded-[22px] p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
              Reporting window
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">{rangeLabel}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--workspace-muted)]">
              Performance is best read as a mix of volume, rate, occupancy, and consistency. This page keeps those signals together.
            </p>
          </div>
          <div className="workspace-soft-card rounded-[22px] p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
              Reading tip
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
              Start with bookings, guests, and nights for demand. Then read occupancy, ADR, and RevPAR to understand pricing quality. Use monthly and calendar views when you want the deeper story behind the numbers.
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <SectionCard
          title="Top Drivers"
          subtitle="What is leading performance inside the current filters."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="workspace-soft-card rounded-[22px] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                Strongest month
              </p>
              <p className="mt-2 text-xl font-semibold text-[var(--workspace-text)]">
                {strongestMonth?.label ?? "No month yet"}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--workspace-muted)]">
                {strongestMonth
                  ? `${formatNumber(strongestMonth.bookings)} bookings, ${formatNumber(strongestMonth.guests)} guests, and ${formatNumber(strongestMonth.nights)} nights`
                  : "Import or add some bookings to start reading month-level performance."}
              </p>
            </div>
            <div className="workspace-soft-card rounded-[22px] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                Leading channel
              </p>
              <p className="mt-2 text-xl font-semibold text-[var(--workspace-text)]">
                {leadingChannel?.label ?? "No channel yet"}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--workspace-muted)]">
                {leadingChannel
                  ? `${formatNumber(leadingChannel.bookings)} bookings in the current view`
                  : "Bookings will surface the strongest channel automatically."}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Channel Mix"
          subtitle="Revenue contribution by booking source."
        >
          <div className="space-y-3">
            {view.revenueByChannel.length === 0 ? (
              <div className="workspace-soft-card rounded-[22px] p-5 text-sm text-[var(--workspace-muted)]">
                No channels yet. Add bookings or import a workbook to populate channel performance.
              </div>
            ) : (
              view.revenueByChannel.slice(0, 5).map((channel) => {
                const share =
                  view.metrics.grossRevenue > 0 ? channel.revenue / view.metrics.grossRevenue : 0;

                return (
                  <article key={channel.label} className="workspace-soft-card rounded-[22px] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[var(--workspace-text)]">{channel.label}</p>
                        <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                          {formatNumber(channel.bookings)} bookings
                        </p>
                      </div>
                      {!view.mixedCurrencyMode ? (
                        <p className="text-sm font-semibold text-[var(--workspace-text)]">
                          {formatCurrency(channel.revenue, false, currencyCode)}
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-[var(--workspace-text)]">
                          {formatNumber(channel.bookings)}
                        </p>
                      )}
                    </div>
                    {!view.mixedCurrencyMode ? (
                      <p className="mt-3 text-xs text-[var(--workspace-muted)]">
                        {formatPercent(share)} of revenue in the selected view
                      </p>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
