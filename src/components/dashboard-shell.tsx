"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
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
import { formatCurrency, formatDateLabel, formatNumber } from "@/lib/format";
import { getMarketDefinition } from "@/lib/markets";
import { ChartsPanel } from "@/components/charts-panel";
import { TaxEstimationCard } from "@/components/dashboard/TaxEstimationCard";
import { ExportReportLink } from "@/components/export-report-link";
import { FilterBar } from "@/components/filter-bar";
import { ManualEntryPanel } from "@/components/manual-entry-panel";
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
  pageTitle?: string;
  pageSubtitle?: string;
  insightsEnabled?: boolean;
  reportExportEnabled?: boolean;
  subscriptionBadge?: {
    label: string;
    detail?: string;
    tone?: "trial" | "expired" | "starter" | "pro" | "portfolio";
  };
  showUpgradeAction?: boolean;
};

type DashboardInsightTone = "positive" | "neutral" | "caution";

type DashboardInsight = {
  label: string;
  text: string;
  tone: DashboardInsightTone;
  score: number;
};

function recordKey(
  record: { id?: number; source?: string },
  fallback: string,
  index: number,
) {
  return record.id ? `${record.source ?? "row"}-${record.id}` : `${fallback}-${index}`;
}

function profitState(netProfit: number) {
  if (netProfit > 0) {
    return {
      chip: "Profitable",
      chipClass: "bg-emerald-400/14 text-emerald-200",
      valueClass: "text-white",
      helper: "Net profit after payout and expenses.",
    };
  }

  if (netProfit < 0) {
    return {
      chip: "Losing money",
      chipClass: "bg-rose-400/14 text-rose-200",
      valueClass: "text-rose-200",
      helper: "Expenses are heavier than payout in this view.",
    };
  }

  return {
    chip: "Break-even",
    chipClass: "bg-slate-400/14 text-slate-200",
    valueClass: "text-white",
    helper: "The business is neither ahead nor behind right now.",
  };
}

function getTimeContext(view: DashboardView) {
  const { filters, rangeLabel } = view;
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  });

  if (filters.rangePreset === "this-month") {
    return formatter.format(new Date());
  }

  if (filters.rangePreset === "this-year") {
    return String(new Date().getFullYear());
  }

  if (filters.rangePreset === "last-year") {
    return String(new Date().getFullYear() - 1);
  }

  if (filters.year !== "all" && filters.month !== "all") {
    return formatter.format(new Date(filters.year, filters.month - 1, 1));
  }

  if (filters.year !== "all") {
    return String(filters.year);
  }

  return rangeLabel;
}

function getTimeContextHint(view: DashboardView) {
  const { filters, rangeLabel } = view;

  if (filters.rangePreset === "this-month") {
    return "Current month";
  }

  if (filters.rangePreset === "this-year" || filters.rangePreset === "last-year") {
    return rangeLabel;
  }

  if (filters.rangePreset === "custom") {
    return "Custom date range";
  }

  if (filters.rangePreset === "last-90-days") {
    return "Rolling period";
  }

  if (filters.rangePreset === "all-time") {
    return "Full imported history";
  }

  if (filters.year !== "all" && filters.month !== "all") {
    return "Selected month";
  }

  if (filters.year !== "all") {
    return "Selected year";
  }

  return "Current view";
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatWholePercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getRelativeChange(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }

  return (current - previous) / Math.abs(previous);
}

function channelLabel(channel: "airbnb" | "booking" | "other") {
  if (channel === "airbnb") {
    return "Airbnb";
  }

  if (channel === "booking") {
    return "Booking.com";
  }

  return "Other channels";
}

function buildDashboardInsights(view: DashboardView) {
  const insights: DashboardInsight[] = [];
  const latestMonths = view.monthlySummary.slice(-2);
  const previousMonth = latestMonths.at(-2) ?? null;
  const currentMonth = latestMonths.at(-1) ?? null;
  const topExpenseCategory = view.expensesByCategory[0];
  const totalExpenseCategories = view.expensesByCategory.reduce((sum, item) => sum + item.value, 0);
  const topExpenseShare =
    topExpenseCategory && totalExpenseCategories > 0
      ? topExpenseCategory.value / totalExpenseCategories
      : 0;

  if (currentMonth && previousMonth) {
    const profitChange = getRelativeChange(currentMonth.profit, previousMonth.profit);

    if (previousMonth.profit <= 0 && currentMonth.profit > 0) {
      insights.push({
        label: "Momentum",
        text: "Profit turned positive vs last month.",
        tone: "positive",
        score: 94,
      });
    } else if (previousMonth.profit >= 0 && currentMonth.profit < 0) {
      insights.push({
        label: "Momentum",
        text: "Profit fell below break-even vs last month.",
        tone: "caution",
        score: 96,
      });
    } else if (profitChange !== null && Math.abs(profitChange) >= 0.08) {
      insights.push({
        label: "Momentum",
        text: `Profit ${profitChange > 0 ? "rose" : "fell"} ${formatWholePercent(Math.abs(profitChange))} vs last month.`,
        tone: profitChange > 0 ? "positive" : "caution",
        score: 76 + Math.min(Math.round(Math.abs(profitChange) * 100), 18),
      });
    }

    const expenseChange = getRelativeChange(currentMonth.expenses, previousMonth.expenses);

    if (expenseChange !== null && Math.abs(expenseChange) >= 0.12) {
      const expenseLead =
        topExpenseCategory && topExpenseCategory.label.trim().toLowerCase() !== "uncategorized"
          ? `, mainly ${topExpenseCategory.label}.`
          : ".";

      insights.push({
        label: "Costs",
        text: `Expenses ${expenseChange > 0 ? "rose" : "fell"} ${formatWholePercent(Math.abs(expenseChange))} vs last month${expenseChange > 0 ? expenseLead : "."}`,
        tone: expenseChange > 0 ? "caution" : "positive",
        score: 66 + Math.min(Math.round(Math.abs(expenseChange) * 100), 16),
      });
    }
  }

  const revenueByChannelEntries = (
    Object.entries(view.revenueByChannelTotals) as Array<[
      "airbnb" | "booking" | "other",
      number,
    ]>
  )
    .filter(([, value]) => value > 0)
    .sort((left, right) => right[1] - left[1]);
  const totalChannelRevenue = revenueByChannelEntries.reduce((sum, [, value]) => sum + value, 0);
  const topRevenueChannel = revenueByChannelEntries[0];
  const topRevenueShare =
    topRevenueChannel && totalChannelRevenue > 0 ? topRevenueChannel[1] / totalChannelRevenue : 0;

  if (topRevenueChannel && topRevenueShare >= 0.4) {
    insights.push({
      label: "Channel Mix",
      text: `${channelLabel(topRevenueChannel[0])} generated ${formatWholePercent(topRevenueShare)} of revenue.`,
      tone: topRevenueShare >= 0.6 ? "neutral" : "positive",
      score: topRevenueShare >= 0.6 ? 78 : 58,
    });
  }

  const taxShare =
    view.metrics.netProfit > 0 ? view.metrics.estimatedTaxes / view.metrics.netProfit : 0;

  if (view.metrics.estimatedTaxes > 0 && view.metrics.netProfit > 0 && taxShare >= 0.1) {
    insights.push({
      label: "Taxes",
      text: `Estimated taxes absorb ${formatWholePercent(taxShare)} of net profit.`,
      tone: taxShare >= 0.2 ? "caution" : "neutral",
      score: taxShare >= 0.2 ? 74 : 56,
    });
  }

  const hasCostInsight = insights.some((insight) => insight.label === "Costs");

  if (!hasCostInsight && topExpenseCategory && topExpenseShare >= 0.22) {
    insights.push({
      label: "Costs",
      text: `${topExpenseCategory.label} made up ${formatWholePercent(topExpenseShare)} of expenses.`,
      tone: topExpenseShare >= 0.35 ? "caution" : "neutral",
      score: topExpenseShare >= 0.35 ? 62 : 48,
    });
  }

  if (view.metrics.totalRevenue > 0) {
    if (view.metrics.profitMargin < 0) {
      insights.push({
        label: "Margin",
        text: `Current profit margin is ${formatPercent(view.metrics.profitMargin)}.`,
        tone: "caution",
        score: 72,
      });
    } else if (view.metrics.profitMargin <= 0.12) {
      insights.push({
        label: "Margin",
        text: `Only ${formatWholePercent(view.metrics.profitMargin)} of revenue is reaching profit.`,
        tone: "caution",
        score: 60,
      });
    } else if (view.metrics.profitMargin >= 0.28) {
      insights.push({
        label: "Margin",
        text: `You kept ${formatWholePercent(view.metrics.profitMargin)} of revenue as profit.`,
        tone: "positive",
        score: 54,
      });
    }
  }

  return insights
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

export function DashboardShell({
  view,
  latestImport,
  userName,
  userEmail,
  businessName,
  currencyCode,
  properties,
  pageTitle = "Financial Overview",
  pageSubtitle = "Track what the business earned, spent, and kept during the selected period.",
  insightsEnabled = true,
  reportExportEnabled = true,
  subscriptionBadge,
  showUpgradeAction = false,
}: DashboardShellProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const profitMeta = profitState(view.metrics.netProfit);
  const timeContext = getTimeContext(view);
  const timeContextHint = getTimeContextHint(view);
  const afterTaxPositive = view.metrics.profitAfterTax >= 0;
  const insights = view.mixedCurrencyMode ? [] : buildDashboardInsights(view);
  const afterTaxChipLabel =
    view.metrics.profitAfterTax > 0
      ? "Profitable After Tax"
      : view.metrics.profitAfterTax < 0
        ? "Below Break-Even"
        : "Break-Even After Tax";

  return (
    <>
      <WorkspaceShell
        activePage="dashboard"
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
        businessName={businessName}
        userName={userName}
        userEmail={userEmail}
        currencyCode={currencyCode}
        latestImport={latestImport}
        subscriptionBadge={subscriptionBadge}
        actions={
          <>
            {showUpgradeAction ? (
              <Link
                href="/pricing"
                className="workspace-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                Upgrade
              </Link>
            ) : null}
            {reportExportEnabled ? (
              <ExportReportLink className="workspace-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition" />
            ) : null}
            <Link
              href="/dashboard/lab"
              className="workspace-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
            >
              Grid lab
            </Link>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="workspace-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
            >
              Upload data
            </button>
            <button
              type="button"
              onClick={() => setIsEntryOpen(true)}
              className="workspace-button-primary rounded-2xl px-4 py-3 text-sm font-semibold transition"
            >
              Add entry
            </button>
          </>
        }
      >
        <div className="space-y-8">
          <section className="space-y-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
                  Performance Overview
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--workspace-text)] sm:text-[2rem]">
                    {timeContext}
                  </h2>
                  <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-[var(--workspace-muted)]">
                    {timeContextHint}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-[var(--workspace-muted)]">
                  A cleaner snapshot of the selected period, with after-tax profit front and center.
                </p>
              </div>

              <div className="xl:flex xl:flex-1 xl:justify-end">
                <FilterBar
                  channels={view.availableChannels}
                  countries={view.availableCountries}
                  selectedRangePreset={view.filters.rangePreset}
                  selectedStartDate={view.filters.startDate}
                  selectedEndDate={view.filters.endDate}
                  selectedChannel={view.filters.channel}
                  selectedCountryCode={view.filters.countryCode}
                />
              </div>
            </div>

            {view.mixedCurrencyMode ? (
              <SectionCard
                title="Portfolio View"
                subtitle="All markets is useful for portfolio volume, but Hostlyx will not fake a converted profit total across mixed currencies."
              >
                <div className="grid gap-4 xl:grid-cols-3">
                  {view.marketBreakdown.map((market) => {
                    const meta = getMarketDefinition(market.countryCode);

                    return (
                      <article key={market.countryCode} className="workspace-soft-card rounded-[24px] p-6">
                        <p className="text-sm font-semibold text-[var(--workspace-text)]">{meta.countryName}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                          {market.currencyCode}
                        </p>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Revenue</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--workspace-text)]">
                              {formatCurrency(market.revenue, false, market.currencyCode)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Profit</p>
                            <p className={`mt-2 text-sm font-semibold ${market.profit >= 0 ? "text-emerald-300" : "text-rose-200"}`}>
                              {formatCurrency(market.profit, false, market.currencyCode)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Bookings</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--workspace-text)]">{formatNumber(market.bookings)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Expenses</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--workspace-text)]">
                              {formatCurrency(market.expenses, false, market.currencyCode)}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </SectionCard>
            ) : (
              <>
                <section className="grid gap-4">
                  <article className="workspace-card rounded-[32px] p-6 sm:p-7 xl:p-8">
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${afterTaxPositive ? "bg-emerald-400/14 text-emerald-100" : "bg-rose-400/14 text-rose-100"}`}
                          >
                            {afterTaxChipLabel}
                          </span>
                          <span className="text-xs font-medium text-[var(--workspace-muted)]">
                            {timeContext}
                          </span>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
                            Profit After Tax
                          </p>
                          <p
                            className={`mt-5 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl ${afterTaxPositive ? "text-[var(--workspace-text)]" : "text-rose-100"}`}
                          >
                            {formatCurrency(view.metrics.profitAfterTax, false, currencyCode)}
                          </p>
                          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--workspace-muted)]">
                            The clearest signal of what the business actually keeps after operating costs and estimated taxes.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="workspace-soft-card rounded-[26px] p-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                            Estimated Taxes
                          </p>
                          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--workspace-text)]">
                            {formatCurrency(view.metrics.estimatedTaxes, false, currencyCode)}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                            Reserved from net profit based on the current tax view and settings.
                          </p>
                        </div>

                        <div className="workspace-soft-card rounded-[26px] p-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                            View Context
                          </p>
                          <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[var(--workspace-text)]">
                            {timeContext}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                            {timeContextHint}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <article className="workspace-card rounded-[28px] p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted)]">
                            Net Profit
                          </p>
                          <p className={`mt-4 text-3xl font-semibold tracking-[-0.04em] ${profitMeta.valueClass}`}>
                            {formatCurrency(view.metrics.netProfit, false, currencyCode)}
                          </p>
                        </div>
                        <div className="workspace-icon-chip rounded-[18px] p-3">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                      </div>
                    </article>

                    <article className="workspace-card rounded-[28px] p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted)]">
                            Total Revenue
                          </p>
                          <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--workspace-text)]">
                            {formatCurrency(view.metrics.totalRevenue, false, currencyCode)}
                          </p>
                        </div>
                        <div className="workspace-icon-chip rounded-[18px] p-3">
                          <Wallet className="h-5 w-5" />
                        </div>
                      </div>
                    </article>

                    <article className="workspace-card rounded-[28px] p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted)]">
                            Total Expenses
                          </p>
                          <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--workspace-text)]">
                            {formatCurrency(view.metrics.totalExpenses, false, currencyCode)}
                          </p>
                        </div>
                        <div className="rounded-[18px] border border-rose-300/10 bg-rose-400/10 p-3 text-rose-200">
                          <ReceiptText className="h-5 w-5" />
                        </div>
                      </div>
                    </article>

                    <article className="workspace-card rounded-[28px] p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted)]">
                            Profit Margin
                          </p>
                          <p
                            className={`mt-4 text-3xl font-semibold tracking-[-0.04em] ${view.metrics.profitMargin >= 0 ? "text-[var(--workspace-text)]" : "text-rose-100"}`}
                          >
                            {formatPercent(view.metrics.profitMargin)}
                          </p>
                        </div>
                        <div className="workspace-icon-chip rounded-[18px] p-3">
                          <Percent className="h-5 w-5" />
                        </div>
                      </div>
                    </article>
                  </div>

                  <div className="grid gap-4 border-t border-white/6 pt-2 md:grid-cols-2 xl:grid-cols-5">
                    <article className="workspace-soft-card rounded-[24px] p-5">
                      <div className="flex items-center gap-3">
                        <div className="workspace-icon-chip rounded-[18px] p-3">
                          <ArrowDownRight className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Net Payout</p>
                          <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--workspace-text)]">
                            {formatCurrency(view.metrics.totalPayout, false, currencyCode)}
                          </p>
                        </div>
                      </div>
                    </article>

                    <article className="workspace-soft-card rounded-[24px] p-5">
                      <div className="flex items-center gap-3">
                        <div className="rounded-[18px] border border-white/8 bg-white/[0.04] p-3 text-[var(--workspace-text)]">
                          <ReceiptText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Estimated Taxes</p>
                          <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--workspace-text)]">
                            {formatCurrency(view.metrics.estimatedTaxes, false, currencyCode)}
                          </p>
                        </div>
                      </div>
                    </article>

                    <article className="workspace-soft-card rounded-[24px] p-5">
                      <div className="flex items-center gap-3">
                        <div className="workspace-icon-chip rounded-[18px] p-3">
                          <CalendarDays className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Bookings</p>
                          <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--workspace-text)]">
                            {formatNumber(view.metrics.bookingsCount)}
                          </p>
                        </div>
                      </div>
                    </article>

                    <article className="workspace-soft-card rounded-[24px] p-5">
                      <div className="flex items-center gap-3">
                        <div className="workspace-icon-chip rounded-[18px] p-3">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">ADR</p>
                          <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--workspace-text)]">
                            {formatCurrency(view.metrics.adr, false, currencyCode)}
                          </p>
                        </div>
                      </div>
                    </article>

                    <article className="workspace-soft-card rounded-[24px] p-5">
                      <div className="flex items-center gap-3">
                        <div className="workspace-icon-chip rounded-[18px] p-3">
                          <ArrowUpRight className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Occupancy</p>
                          <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--workspace-text)]">
                            {formatPercent(view.metrics.occupancyRate)}
                          </p>
                        </div>
                      </div>
                    </article>
                  </div>
                </section>
              </>
            )}
          </section>

          <SectionCard
            title="Insights"
            subtitle="The few signals that stand out in the current view."
          >
            {!insightsEnabled ? (
              <div className="workspace-soft-card rounded-[24px] p-5">
                <p className="text-sm font-semibold text-[var(--workspace-text)]">
                  Upgrade to Pro for insights
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--workspace-muted)]">
                  Smart summary cards unlock on Pro and Portfolio so you can catch revenue, cost, and margin shifts faster.
                </p>
                <Link
                  href="/pricing"
                  className="workspace-button-secondary mt-4 inline-flex rounded-2xl px-4 py-3 text-sm font-semibold transition"
                >
                  View plans
                </Link>
              </div>
            ) : view.mixedCurrencyMode ? (
              <div className="workspace-soft-card rounded-[24px] p-5 text-sm leading-7 text-[var(--workspace-muted)]">
                Select a single market to unlock insights with comparable amounts.
              </div>
            ) : insights.length === 0 ? (
              <div className="workspace-soft-card rounded-[24px] p-5 text-sm leading-7 text-[var(--workspace-muted)]">
                Not enough meaningful signals yet for this time range.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {insights.map((insight) => (
                  <article
                    key={`${insight.label}-${insight.text}`}
                    className={`workspace-soft-card rounded-[24px] p-5 ${
                      insight.tone === "positive"
                        ? "border-emerald-300/12"
                        : insight.tone === "caution"
                          ? "border-rose-300/12"
                          : ""
                    }`}
                  >
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        insight.tone === "positive"
                          ? "text-emerald-200"
                          : insight.tone === "caution"
                            ? "text-rose-200"
                            : "text-[var(--workspace-muted)]"
                      }`}
                    >
                      {insight.label}
                    </p>
                    <p className="mt-3 text-base font-medium leading-7 text-[var(--workspace-text)]">
                      {insight.text}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <TaxEstimationCard
            key={`${view.taxSettings.countryCode}-${view.taxSettings.taxRate}-${view.taxSettings.savedCountryCode}`}
            countryCode={view.taxSettings.countryCode}
            savedCountryCode={view.taxSettings.savedCountryCode}
            taxRate={view.taxSettings.taxRate}
            suggestedTaxRate={view.taxSettings.suggestedTaxRate}
            estimatedTaxes={view.metrics.estimatedTaxes}
            profitAfterTax={view.metrics.profitAfterTax}
            currencyCode={currencyCode}
            mixedCurrencyMode={view.mixedCurrencyMode}
            usesSavedSettings={view.taxSettings.usesSavedSettings}
            usesCustomRate={view.taxSettings.usesCustomRate}
          />

          <ChartsPanel
            monthlySummary={view.monthlySummary}
            expensesByCategory={view.expensesByCategory}
            revenueByChannel={view.revenueByChannel}
            currencyCode={currencyCode}
            mixedCurrencyMode={view.mixedCurrencyMode}
          />

          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <SectionCard title="Recent Bookings" subtitle="Latest stays entering the business right now.">
              <div className="space-y-3">
                {view.recentBookings.length === 0 ? (
                  <div className="workspace-soft-card rounded-[22px] p-5 text-sm text-[var(--workspace-muted)]">
                    No bookings yet. Upload a workbook or add the first stay to start reading the business.
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
                            <p className="text-base font-semibold text-[var(--workspace-text)]">{booking.guestName}</p>
                            <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                              {booking.channel} • {booking.propertyName}
                              {booking.unitName ? ` • ${booking.unitName}` : ""}
                            </p>
                          </div>
                          <p className="text-sm text-[var(--workspace-muted)]">
                            {formatDateLabel(booking.checkIn)} to {formatDateLabel(booking.checkout)}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[300px]">
                          <div className="workspace-card rounded-[18px] px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Guests</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">{formatNumber(booking.guestCount)}</p>
                          </div>
                          <div className="workspace-card rounded-[18px] px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Nights</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">{formatNumber(booking.nights)}</p>
                          </div>
                          <div className="workspace-card rounded-[18px] px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Payout</p>
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

            <SectionCard title="Recent Expenses" subtitle="The latest places where money left the business.">
              <div className="space-y-3">
                {view.recentExpenses.length === 0 ? (
                  <div className="workspace-soft-card rounded-[22px] p-5 text-sm text-[var(--workspace-muted)]">
                    No expenses yet. Add costs to understand where money is going.
                  </div>
                ) : (
                  view.recentExpenses.map((expense, index) => (
                    <div
                      key={recordKey(expense, `${expense.date}-${expense.description}`, index)}
                      className="workspace-soft-card rounded-[22px] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <p className="font-semibold text-[var(--workspace-text)]">{expense.description}</p>
                          <p className="text-sm text-[var(--workspace-muted)]">
                            {expense.category} • {expense.propertyName}
                            {expense.unitName ? ` • ${expense.unitName}` : ""}
                          </p>
                          <p className="text-sm text-[var(--workspace-muted)]">{formatDateLabel(expense.date)}</p>
                          {expense.note ? <p className="text-sm text-[var(--workspace-muted)]">{expense.note}</p> : null}
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
        </div>
      </WorkspaceShell>

      <Modal
        open={isUploadOpen}
        title="Upload Spreadsheet Data"
        onClose={() => setIsUploadOpen(false)}
      >
        <UploadPanel properties={properties} />
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
