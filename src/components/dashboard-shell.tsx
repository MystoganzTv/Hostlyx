"use client";

import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Percent,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type {
  CurrencyCode,
  DashboardView,
  ImportSummary,
  PropertyDefinition,
} from "@/lib/types";
import { formatCurrency, formatDateLabel, formatNumber, formatPercent } from "@/lib/format";
import { ChartsPanel } from "@/components/charts-panel";
import { FilterBar } from "@/components/filter-bar";
import { ManualEntryPanel } from "@/components/manual-entry-panel";
import { MetricCard } from "@/components/metric-card";
import { Modal } from "@/components/modal";
import { SectionCard } from "@/components/section-card";
import { UploadPanel } from "@/components/upload-panel";
import { WorkspaceShell } from "@/components/workspace-shell";

type DashboardShellProps = {
  view: DashboardView;
  latestImport: ImportSummary | null;
  userName: string;
  userEmail: string;
  businessName: string;
  currencyCode: CurrencyCode;
  properties: PropertyDefinition[];
};

function recordKey(
  record: { id?: number; source?: string },
  fallback: string,
  index: number,
) {
  return record.id ? `${record.source ?? "row"}-${record.id}` : `${fallback}-${index}`;
}

export function DashboardShell({
  view,
  latestImport,
  userName,
  userEmail,
  businessName,
  currencyCode,
  properties,
}: DashboardShellProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEntryOpen, setIsEntryOpen] = useState(false);

  const metricCards = [
    {
      label: "Gross Revenue",
      value: view.metrics.grossRevenue,
      format: "currency" as const,
      icon: <Wallet className="h-5 w-5" />,
    },
    {
      label: "Net Payout",
      value: view.metrics.netPayout,
      format: "currency" as const,
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: "Total Expenses",
      value: view.metrics.totalExpenses,
      format: "currency" as const,
      icon: <ReceiptText className="h-5 w-5" />,
    },
    {
      label: "Net Profit",
      value: view.metrics.netProfit,
      format: "currency" as const,
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: "Profit Margin",
      value: view.metrics.profitMargin,
      format: "percent" as const,
      icon: <Percent className="h-5 w-5" />,
    },
    {
      label: "Total Bookings",
      value: view.metrics.bookingsCount,
      format: "number" as const,
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      label: "Nights Booked",
      value: view.metrics.nightsBooked,
      format: "number" as const,
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      label: "ADR",
      value: view.metrics.adr,
      format: "currency" as const,
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      label: "Occupancy Rate",
      value: view.metrics.occupancyRate,
      format: "percent" as const,
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: "RevPAR",
      value: view.metrics.revPar,
      format: "currency" as const,
      icon: <TrendingUp className="h-5 w-5" />,
    },
  ];

  return (
    <>
      <WorkspaceShell
        activePage="dashboard"
        pageTitle="Dashboard"
        pageSubtitle="Your financial overview at a glance"
        businessName={businessName}
        userName={userName}
        userEmail={userEmail}
        currencyCode={currencyCode}
        latestImport={latestImport}
        actions={
          <>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="workspace-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
            >
              Import Excel
            </button>
            <button
              type="button"
              onClick={() => setIsEntryOpen(true)}
              className="workspace-button-primary rounded-2xl px-4 py-3 text-sm font-semibold transition"
            >
              Add Entry
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="flex justify-end">
            <FilterBar
              years={view.availableYears}
              channels={view.availableChannels}
              selectedYear={view.filters.year}
              selectedMonth={view.filters.month}
              selectedChannel={view.filters.channel}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {metricCards.map((card) => (
              <MetricCard
                key={card.label}
                label={card.label}
                value={card.value}
                format={card.format}
                currencyCode={currencyCode}
                icon={card.icon}
              />
            ))}
          </div>

          <ChartsPanel
            revenueByMonth={view.revenueByMonth}
            profitByMonth={view.profitByMonth}
            expensesByCategory={view.expensesByCategory}
            revenueByChannel={view.revenueByChannel}
            currencyCode={currencyCode}
          />

          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <SectionCard title="Recent Bookings" subtitle="Guest stays, nights, and payouts from the latest activity.">
              <div className="space-y-3">
                {view.recentBookings.length === 0 ? (
                  <div className="workspace-soft-card rounded-[22px] p-5 text-sm text-[var(--workspace-muted)]">
                    No bookings yet. Import your Excel file to start populating this view.
                  </div>
                ) : (
                  view.recentBookings.map((booking, index) => (
                    <article
                      key={recordKey(booking, `${booking.checkIn}-${booking.guestName}`, index)}
                      className="workspace-soft-card rounded-[22px] p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div>
                            <p className="text-base font-semibold text-[var(--workspace-text)]">
                              {booking.guestName}
                            </p>
                            <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                              {booking.propertyName}
                              {booking.unitName ? ` • ${booking.unitName}` : ""}
                              {` • ${booking.channel} • ${booking.rentalPeriod}`}
                            </p>
                          </div>
                          <p className="text-sm text-[var(--workspace-muted)]">
                            {formatDateLabel(booking.checkIn)} to {formatDateLabel(booking.checkout)}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[300px]">
                          <div className="workspace-card rounded-[18px] px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                              Guests
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                              {formatNumber(booking.guestCount)}
                            </p>
                          </div>
                          <div className="workspace-card rounded-[18px] px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                              Nights
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                              {formatNumber(booking.nights)}
                            </p>
                          </div>
                          <div className="workspace-card rounded-[18px] px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                              Payout
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                              {formatCurrency(booking.payout, false, currencyCode)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard title="Recent Expenses" subtitle="Latest operating costs grouped by category and note.">
              <div className="space-y-3">
                {view.recentExpenses.length === 0 ? (
                  <div className="workspace-soft-card rounded-[22px] p-5 text-sm text-[var(--workspace-muted)]">
                    No expenses yet. Import your Excel file to populate expense reporting.
                  </div>
                ) : (
                  view.recentExpenses.map((expense, index) => (
                    <div
                      key={recordKey(expense, `${expense.date}-${expense.description}`, index)}
                      className="workspace-soft-card rounded-[22px] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <p className="font-semibold text-[var(--workspace-text)]">
                            {expense.description}
                          </p>
                          <p className="text-sm text-[var(--workspace-muted)]">
                            {expense.propertyName}
                            {expense.unitName ? ` • ${expense.unitName}` : ""}
                            {` • ${expense.category} • ${formatDateLabel(expense.date)}`}
                          </p>
                          {expense.note ? (
                            <p className="text-sm text-[var(--workspace-muted)]">{expense.note}</p>
                          ) : null}
                        </div>
                        <span className="text-sm font-semibold text-[var(--workspace-text)]">
                          {formatCurrency(expense.amount, false, currencyCode)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Monthly Summary" subtitle="Revenue, payout, expenses, and profit across the selected window.">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Month</th>
                    <th className="pb-3 pr-4 font-medium">Bookings</th>
                    <th className="pb-3 pr-4 font-medium">Revenue</th>
                    <th className="pb-3 pr-4 font-medium">Payout</th>
                    <th className="pb-3 pr-4 font-medium">Expenses</th>
                    <th className="pb-3 pr-4 font-medium">Profit</th>
                    <th className="pb-3 font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {view.monthlySummary.map((month, index) => {
                    const margin = month.revenue > 0 ? month.profit / month.revenue : 0;

                    return (
                      <tr
                        key={`${month.label}-${index}`}
                        className="border-t border-[var(--workspace-border)] text-[var(--workspace-text)]"
                      >
                        <td className="py-4 pr-4 font-medium">{month.label}</td>
                        <td className="py-4 pr-4">{formatNumber(month.bookings)}</td>
                        <td className="py-4 pr-4">{formatCurrency(month.revenue, false, currencyCode)}</td>
                        <td className="py-4 pr-4">{formatCurrency(month.payout, false, currencyCode)}</td>
                        <td className="py-4 pr-4">{formatCurrency(month.expenses, false, currencyCode)}</td>
                        <td className="py-4 pr-4">{formatCurrency(month.profit, false, currencyCode)}</td>
                        <td className="py-4">{formatPercent(margin)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </WorkspaceShell>

      <Modal
        open={isUploadOpen}
        title="Import Excel Workbook"
        onClose={() => setIsUploadOpen(false)}
      >
        <UploadPanel />
      </Modal>

      <Modal
        open={isEntryOpen}
        title="Add Booking or Expense"
        onClose={() => setIsEntryOpen(false)}
      >
        <ManualEntryPanel properties={properties} />
      </Modal>
    </>
  );
}
