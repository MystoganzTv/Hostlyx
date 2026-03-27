import { redirect } from "next/navigation";
import { buildDashboardView, getDashboardFilters } from "@/lib/dashboard";
import { getAuthSession } from "@/lib/auth";
import {
  getBookings,
  getExpenses,
  getLatestImport,
  getPropertyDefinitions,
  getSubscriptionState,
  getUserSettings,
} from "@/lib/db";
import { FilterBar } from "@/components/filter-bar";
import { ExportReportLink } from "@/components/export-report-link";
import { SectionCard } from "@/components/section-card";
import { SubscriptionUpgradeCard } from "@/components/subscription-upgrade-card";
import { WorkspaceShell } from "@/components/workspace-shell";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { canAccessReports, getSubscriptionBadge } from "@/lib/subscription";

export const runtime = "nodejs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAuthSession();
  const ownerEmail = session?.user?.email?.toLowerCase();

  if (!session?.user?.email || !ownerEmail) {
    redirect("/login");
  }

  const userName = session.user.name ?? session.user.email ?? "Host";
  const properties = await getPropertyDefinitions(ownerEmail);

  if (properties.length === 0) {
    redirect("/dashboard/properties?setup=1");
  }

  const [bookings, expenses, latestImport, userSettings, resolvedSearchParams, subscription] = await Promise.all([
    getBookings(ownerEmail),
    getExpenses(ownerEmail),
    getLatestImport(ownerEmail),
    getUserSettings(ownerEmail, userName),
    searchParams,
    getSubscriptionState(ownerEmail),
  ]);
  const subscriptionBadge = getSubscriptionBadge(subscription);

  if (!canAccessReports(subscription)) {
    return (
      <WorkspaceShell
        activePage="reports"
        pageTitle="Reports"
        pageSubtitle="Monthly reporting and channel mix are available on Pro and Portfolio."
        businessName={userSettings.businessName}
        userName={userName}
        userEmail={ownerEmail}
        currencyCode={userSettings.currencyCode}
        latestImport={latestImport}
        subscriptionBadge={subscriptionBadge}
      >
        <SubscriptionUpgradeCard
          title="Upgrade to unlock reports"
          description="Reports are part of the Pro plan and above. Your imported data stays safe, and you can upgrade whenever you are ready."
        />
      </WorkspaceShell>
    );
  }

  const filters = getDashboardFilters(
    resolvedSearchParams,
    bookings,
    expenses,
    properties,
    userSettings.primaryCountryCode,
  );
  const view = buildDashboardView({
    bookings,
    expenses,
    filters,
    properties,
    fallbackCountryCode: userSettings.primaryCountryCode,
    taxCountryCode: userSettings.taxCountryCode,
    taxRate: userSettings.taxRate,
  });

  return (
    <WorkspaceShell
      activePage="reports"
      pageTitle="Reports"
      pageSubtitle="Monthly reporting, channel mix, and cost structure for the current business view."
      businessName={userSettings.businessName}
      userName={userName}
      userEmail={ownerEmail}
      currencyCode={view.displayCurrencyCode}
      latestImport={latestImport}
      subscriptionBadge={subscriptionBadge}
      actions={
        <div className="rounded-[28px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
          <FilterBar
            channels={view.availableChannels}
            countries={view.availableCountries}
            selectedRangePreset={view.filters.rangePreset}
            selectedStartDate={view.filters.startDate}
            selectedEndDate={view.filters.endDate}
            selectedChannel={view.filters.channel}
            selectedCountryCode={view.filters.countryCode}
            embedded
          />
          <ExportReportLink
            className="inline-flex min-h-[52px] min-w-[176px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-[var(--workspace-accent)]/22 bg-[linear-gradient(180deg,rgba(88,196,182,0.2)_0%,rgba(88,196,182,0.12)_100%)] px-5 py-3 text-sm font-semibold text-[var(--workspace-text)] shadow-[0_12px_24px_rgba(6,20,35,0.16)] transition hover:border-[var(--workspace-accent)]/34 hover:bg-[linear-gradient(180deg,rgba(88,196,182,0.28)_0%,rgba(88,196,182,0.16)_100%)]"
          />
        </div>
        </div>
      }
    >
      <div className="space-y-6">
        <SectionCard
          title="Monthly Performance"
          subtitle="Revenue, expenses, and profit grouped month by month."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Month</th>
                  <th className="pb-3 pr-4 font-medium">Bookings</th>
                  <th className="pb-3 pr-4 font-medium">Revenue</th>
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
                      <td className="py-4 pr-4">{formatCurrency(month.revenue, false, view.displayCurrencyCode)}</td>
                      <td className="py-4 pr-4">{formatCurrency(month.expenses, false, view.displayCurrencyCode)}</td>
                      <td className={`py-4 pr-4 ${month.profit >= 0 ? "text-emerald-300" : "text-rose-200"}`}>
                        {formatCurrency(month.profit, false, view.displayCurrencyCode)}
                      </td>
                      <td className="py-4">{formatPercent(margin)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Revenue by Channel"
            subtitle="Which platforms are actually driving the business."
          >
            <div className="space-y-3">
              {view.revenueByChannel.map((channel) => (
                <div key={channel.label} className="workspace-soft-card rounded-[22px] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--workspace-text)]">{channel.label}</p>
                      <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                        {formatNumber(channel.bookings)} bookings
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--workspace-text)]">
                      {formatCurrency(channel.revenue, false, view.displayCurrencyCode)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Cost Structure"
            subtitle="The categories taking the largest share of expenses."
          >
            <div className="space-y-3">
              {view.expensesByCategory.map((item) => {
                const totalExpenses = view.expensesByCategory.reduce((sum, current) => sum + current.value, 0);
                const share = totalExpenses > 0 ? item.value / totalExpenses : 0;

                return (
                  <div key={item.label} className="workspace-soft-card rounded-[22px] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[var(--workspace-text)]">{item.label}</p>
                        <p className="mt-1 text-sm text-[var(--workspace-muted)]">{formatPercent(share)} of total expenses</p>
                      </div>
                      <span className="text-sm font-semibold text-[var(--workspace-text)]">
                        {formatCurrency(item.value, false, view.displayCurrencyCode)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>
    </WorkspaceShell>
  );
}
