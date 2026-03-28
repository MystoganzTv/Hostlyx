import { redirect } from "next/navigation";
import { BookOpenText, Home } from "lucide-react";
import { BookingsManager } from "@/components/bookings-manager";
import { FilterBar } from "@/components/filter-bar";
import { SectionCard } from "@/components/section-card";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getAuthSession } from "@/lib/auth";
import {
  buildDashboardView,
  filterBookingsForFilters,
  getDashboardFilters,
} from "@/lib/dashboard";
import {
  getBookings,
  getExpenses,
  getFinancialDocuments,
  getLatestImport,
  getPropertyDefinitions,
  getUserSettings,
} from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { getReconcileSidebarBadge } from "@/lib/reconcile";

export const runtime = "nodejs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BookingsPage({
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
  const filteredBookings = filterBookingsForFilters({
    bookings,
    filters,
    properties,
    fallbackCountryCode: userSettings.primaryCountryCode,
  });
  const highlightedBookingKey =
    typeof resolvedSearchParams.booking === "string" ? resolvedSearchParams.booking : null;

  const propertyCount = new Set(filteredBookings.map((booking) => booking.propertyName)).size;

  return (
    <WorkspaceShell
      activePage="bookings"
      pageTitle="Bookings"
      pageSubtitle="Review guest stays, payouts, and property assignments."
      businessName={userSettings.businessName}
      userName={userName}
      userEmail={ownerEmail}
      currencyCode={view.displayCurrencyCode}
      latestImport={latestImport}
      reconcileBadge={getReconcileSidebarBadge(view.reconcile, view.displayCurrencyCode)}
    >
      <div className="space-y-6">
        <div className="flex justify-end">
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
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SectionCard title="Bookings in view">
            <div className="flex items-center gap-3">
              <div className="workspace-icon-chip rounded-2xl p-3">
                <BookOpenText className="h-5 w-5" />
              </div>
              <p className="text-2xl font-semibold text-[var(--workspace-text)]">
                {formatNumber(filteredBookings.length)}
              </p>
            </div>
          </SectionCard>
          <SectionCard title="Properties in view">
            <div className="flex items-center gap-3">
              <div className="workspace-icon-chip rounded-2xl p-3">
                <Home className="h-5 w-5" />
              </div>
              <p className="text-2xl font-semibold text-[var(--workspace-text)]">
                {formatNumber(propertyCount)}
              </p>
            </div>
          </SectionCard>
          <SectionCard title="Editing">
            <p className="text-sm leading-6 text-[var(--workspace-muted)]">
              Use this page to review imported stays, correct guest data, and keep bookings accurate directly inside Hostlyx.
            </p>
          </SectionCard>
        </div>

        <SectionCard
          title="All Bookings"
          subtitle="Use the filters above to focus by market, date range, and channel."
        >
          <BookingsManager
            bookings={filteredBookings}
            currencyCode={view.displayCurrencyCode}
            properties={properties}
            highlightedBookingKey={highlightedBookingKey}
          />
        </SectionCard>
      </div>
    </WorkspaceShell>
  );
}
