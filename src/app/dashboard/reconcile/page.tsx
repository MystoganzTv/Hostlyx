import Link from "next/link";
import { redirect } from "next/navigation";
import { FilterBar } from "@/components/filter-bar";
import { ReconcilePanel } from "@/components/reconcile-panel";
import { ReconcileStatementLauncher } from "@/components/reconcile-statement-launcher";
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
import { getReconcileSidebarBadge } from "@/lib/reconcile";
import { getRequestLocale } from "@/lib/server-locale";

export const runtime = "nodejs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ReconcilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const locale = await getRequestLocale();
  const isSpanish = locale === "es";
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
    locale,
  });

  return (
    <WorkspaceShell
      activePage="reconcile"
      pageTitle={isSpanish ? "Conciliar" : "Reconcile"}
      pageSubtitle={
        isSpanish
          ? "Compara el payout esperado de las reservas con lo que los statements dicen que realmente cayó."
          : "Compare expected payout from bookings against what statements say actually landed."
      }
      businessName={userSettings.businessName}
      userName={userName}
      userEmail={ownerEmail}
      currencyCode={view.displayCurrencyCode}
      latestImport={latestImport}
      reconcileBadge={getReconcileSidebarBadge(view.reconcile, view.displayCurrencyCode)}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-3">
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
          <ReconcileStatementLauncher properties={properties} />
        </div>
      }
    >
      <div className="space-y-6">
        {view.reconcile ? (
          <ReconcilePanel
            reconcile={view.reconcile}
            currencyCode={view.displayCurrencyCode}
          />
        ) : (
          <SectionCard
            title={isSpanish ? "Todavía no hay statement importado" : "No statement imported yet"}
            subtitle={
              isSpanish
                ? "Importa un statement financiero para comparar expectativas de reservas con payout real."
                : "Import a financial statement to compare booking expectations against real payout."
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-2xl text-sm leading-7 text-[var(--workspace-muted)]">
                {isSpanish
                  ? "Reconcile estará disponible una vez que Hostlyx tenga al menos un statement financiero importado que se solape con el periodo seleccionado."
                  : "Reconcile becomes available once Hostlyx has at least one imported financial statement that overlaps the selected reporting period."}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <ReconcileStatementLauncher properties={properties} />
                <Link
                  href="/dashboard/imports"
                  className="workspace-button-secondary inline-flex rounded-2xl px-4 py-3 text-sm font-semibold transition"
                >
                  {isSpanish ? "Ir al centro de importación" : "Go to Import Center"}
                </Link>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </WorkspaceShell>
  );
}
