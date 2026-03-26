"use client";

import { useState } from "react";
import {
  BarChart3,
  LayoutDashboard,
  NotebookPen,
  PanelsTopLeft,
  ReceiptText,
} from "lucide-react";
import { SignOutButton } from "@/components/auth-buttons";
import type { DashboardView, ImportSummary } from "@/lib/types";
import { formatCurrency, formatDateLabel, formatNumber, formatPercent } from "@/lib/format";
import { ChartsPanel } from "@/components/charts-panel";
import { FilterBar } from "@/components/filter-bar";
import { ManualEntryPanel } from "@/components/manual-entry-panel";
import { MetricCard } from "@/components/metric-card";
import { Modal } from "@/components/modal";
import { SectionCard } from "@/components/section-card";
import { UploadPanel } from "@/components/upload-panel";

type DashboardShellProps = {
  view: DashboardView;
  latestImport: ImportSummary | null;
  userName: string;
  userEmail: string;
  manualBookingsCount: number;
  manualExpensesCount: number;
  importedBookingsCount: number;
  importedExpensesCount: number;
};

type ActiveTab = "overview" | "activity" | "data";

function tabClassName(active: boolean) {
  return active
    ? "rounded-2xl bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950"
    : "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]";
}

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
  manualBookingsCount,
  manualExpensesCount,
  importedBookingsCount,
  importedExpensesCount,
}: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEntryOpen, setIsEntryOpen] = useState(false);

  const metricCards = [
    {
      label: "Gross Revenue",
      value: view.metrics.grossRevenue,
      format: "currency" as const,
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      label: "Net Payout",
      value: view.metrics.netPayout,
      format: "currency" as const,
      icon: <LayoutDashboard className="h-5 w-5" />,
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
      icon: <PanelsTopLeft className="h-5 w-5" />,
    },
    {
      label: "Profit Margin",
      value: view.metrics.profitMargin,
      format: "percent" as const,
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      label: "Bookings Count",
      value: view.metrics.bookingsCount,
      format: "number" as const,
      icon: <NotebookPen className="h-5 w-5" />,
    },
    {
      label: "Nights Booked",
      value: view.metrics.nightsBooked,
      format: "number" as const,
      icon: <LayoutDashboard className="h-5 w-5" />,
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
      icon: <PanelsTopLeft className="h-5 w-5" />,
    },
    {
      label: "RevPAR",
      value: view.metrics.revPar,
      format: "currency" as const,
      icon: <ReceiptText className="h-5 w-5" />,
    },
  ];

  return (
    <>
      <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8 xl:px-8">
        <header className="card-surface rounded-[30px] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-100">
                  HomeXperience
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                  {latestImport?.fileName ?? "No workbook imported"}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Airbnb host accounting dashboard
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Less spreadsheet juggling, more live numbers.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="rounded-2xl bg-teal-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200"
              >
                Import Excel
              </button>
              <button
                type="button"
                onClick={() => setIsEntryOpen(true)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
              >
                Add Entry
              </button>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left">
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-xs text-slate-400">{userEmail}</p>
              </div>
              <SignOutButton />
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <FilterBar
            years={view.availableYears}
            channels={view.availableChannels}
            selectedYear={view.filters.year}
            selectedMonth={view.filters.month}
            selectedChannel={view.filters.channel}
          />

          <section className="card-surface rounded-[28px] p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Imported rows
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {formatNumber(importedBookingsCount + importedExpensesCount)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Manual rows
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {formatNumber(manualBookingsCount + manualExpensesCount)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Last import
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {latestImport ? formatDateLabel(latestImport.importedAt.slice(0, 10)) : "Pending"}
                </p>
              </div>
            </div>
          </section>
        </div>

        <nav className="flex flex-wrap gap-3">
          <button
            type="button"
            className={tabClassName(activeTab === "overview")}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={tabClassName(activeTab === "activity")}
            onClick={() => setActiveTab("activity")}
          >
            Activity
          </button>
          <button
            type="button"
            className={tabClassName(activeTab === "data")}
            onClick={() => setActiveTab("data")}
          >
            Data
          </button>
        </nav>

        {activeTab === "overview" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {metricCards.map((card) => (
                <MetricCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  format={card.format}
                  icon={card.icon}
                />
              ))}
            </div>

            <ChartsPanel
              revenueByMonth={view.revenueByMonth}
              profitByMonth={view.profitByMonth}
              expensesByCategory={view.expensesByCategory}
              revenueByChannel={view.revenueByChannel}
            />

            <SectionCard title="Monthly Summary">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
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
                          className="border-t border-white/8 text-slate-200"
                        >
                          <td className="py-4 pr-4 font-medium text-white">{month.label}</td>
                          <td className="py-4 pr-4">{formatNumber(month.bookings)}</td>
                          <td className="py-4 pr-4">{formatCurrency(month.revenue)}</td>
                          <td className="py-4 pr-4">{formatCurrency(month.payout)}</td>
                          <td className="py-4 pr-4">{formatCurrency(month.expenses)}</td>
                          <td className="py-4 pr-4">{formatCurrency(month.profit)}</td>
                          <td className="py-4">{formatPercent(margin)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        ) : null}

        {activeTab === "activity" ? (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard title="Recent Bookings">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">Guest</th>
                      <th className="pb-3 pr-4 font-medium">Check-in</th>
                      <th className="pb-3 pr-4 font-medium">Checkout</th>
                      <th className="pb-3 pr-4 font-medium">Channel</th>
                      <th className="pb-3 pr-4 font-medium">Nights</th>
                      <th className="pb-3 font-medium">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.recentBookings.map((booking, index) => (
                      <tr
                        key={recordKey(booking, `${booking.checkIn}-${booking.guestName}`, index)}
                        className="border-t border-white/8 text-slate-200"
                      >
                        <td className="py-4 pr-4 font-medium text-white">{booking.guestName}</td>
                        <td className="py-4 pr-4">{formatDateLabel(booking.checkIn)}</td>
                        <td className="py-4 pr-4">{formatDateLabel(booking.checkout)}</td>
                        <td className="py-4 pr-4">{booking.channel}</td>
                        <td className="py-4 pr-4">{formatNumber(booking.nights)}</td>
                        <td className="py-4">{formatCurrency(booking.payout)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Recent Expenses">
              <div className="space-y-3">
                {view.recentExpenses.map((expense, index) => (
                  <div
                    key={recordKey(expense, `${expense.date}-${expense.description}`, index)}
                    className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{expense.description}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {expense.category} • {formatDateLabel(expense.date)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-100">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === "data" ? (
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <SectionCard title="Data Sources">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Workbook import
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatNumber(importedBookingsCount + importedExpensesCount)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Bookings and expenses from Excel.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Manual entries
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatNumber(manualBookingsCount + manualExpensesCount)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Rows created directly inside the app.
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Rules">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
                  Only `Bookings` and `Expenses` are imported.
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
                  New imports are added to your saved data and exact duplicates are skipped.
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
                  Channel filters affect bookings only.
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
                  Occupancy assumes one active listing for now.
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}
      </main>

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
        <ManualEntryPanel />
      </Modal>
    </>
  );
}
