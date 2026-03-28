import { redirect } from "next/navigation";
import { buildDashboardView, getDashboardFilters } from "@/lib/dashboard";
import { getAuthSession } from "@/lib/auth";
import {
  getBookings,
  getExpenses,
  getFinancialDocuments,
  getLatestImport,
  getPropertyDefinitions,
  getUserSettings,
} from "@/lib/db";
import { CashflowPanel } from "@/components/cashflow-panel";
import { FilterBar } from "@/components/filter-bar";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getReconcileSidebarBadge } from "@/lib/reconcile";

export const runtime = "nodejs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CashflowPage({
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

  const [bookings, expenses, financialDocuments, latestImport, userSettings, resolvedSearchParams] = await Promise.all([
    getBookings(ownerEmail),
    getExpenses(ownerEmail),
    getFinancialDocuments(ownerEmail),
    getLatestImport(ownerEmail),
    getUserSettings(ownerEmail, userName),
    searchParams,
  ]);

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
    financialDocuments,
    filters,
    properties,
    fallbackCountryCode: userSettings.primaryCountryCode,
    taxCountryCode: userSettings.taxCountryCode,
    taxRate: userSettings.taxRate,
  });

  return (
    <WorkspaceShell
      activePage="cashflow"
      pageTitle="Cashflow"
      pageSubtitle="See payout in, expenses out, and net movement across your reporting window."
      businessName={userSettings.businessName}
      userName={userName}
      userEmail={ownerEmail}
      currencyCode={view.displayCurrencyCode}
      latestImport={latestImport}
      reconcileBadge={getReconcileSidebarBadge(view.reconcile, view.displayCurrencyCode)}
      actions={
        <FilterBar
          channels={view.availableChannels}
          countries={view.availableCountries}
          rangeShortcutYears={view.availableYears}
          selectedRangePreset={view.filters.rangePreset}
          selectedStartDate={view.filters.startDate}
          selectedEndDate={view.filters.endDate}
          selectedChannel={view.filters.channel}
          selectedCountryCode={view.filters.countryCode}
        />
      }
    >
      <CashflowPanel
        view={view}
        currencyCode={view.displayCurrencyCode}
        rangeLabel={view.rangeLabel}
      />
    </WorkspaceShell>
  );
}
