import Link from "next/link";
import { redirect } from "next/navigation";
import { FilterBar } from "@/components/filter-bar";
import { RealityCheckPanel } from "@/components/reality-check-panel";
import { SectionCard } from "@/components/section-card";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getAuthSession } from "@/lib/auth";
import { buildDashboardView, getDashboardFilters } from "@/lib/dashboard";
import {
  getBookings,
  getExpenses,
  getFinancialDocuments,
  getLatestImport,
  getPropertyDefinitions,
  getUserSettings,
} from "@/lib/db";
import { getRealityCheckSidebarBadge } from "@/lib/reality-check";

export const runtime = "nodejs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RealityCheckPage({
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

  const [bookings, expenses, financialDocuments, latestImport, userSettings, resolvedSearchParams] =
    await Promise.all([
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
      activePage="realityCheck"
      pageTitle="Reconcile"
      pageSubtitle="Compare expected payout from bookings against what statements say actually landed."
      businessName={userSettings.businessName}
      userName={userName}
      userEmail={ownerEmail}
      currencyCode={view.displayCurrencyCode}
      latestImport={latestImport}
      realityCheckBadge={getRealityCheckSidebarBadge(view.realityCheck, view.displayCurrencyCode)}
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
      <div className="space-y-6">
        {view.realityCheck ? (
          <RealityCheckPanel
            realityCheck={view.realityCheck}
            currencyCode={view.displayCurrencyCode}
          />
        ) : (
          <SectionCard
            title="No statement imported yet"
            subtitle="Import a financial statement to compare booking expectations against real payout."
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-2xl text-sm leading-7 text-[var(--workspace-muted)]">
                Reconcile becomes available once Hostlyx has at least one imported financial
                statement that overlaps the selected reporting period.
              </p>
              <Link
                href="/dashboard/imports"
                className="workspace-button-primary inline-flex rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                Go to Import Center
              </Link>
            </div>
          </SectionCard>
        )}
      </div>
    </WorkspaceShell>
  );
}
