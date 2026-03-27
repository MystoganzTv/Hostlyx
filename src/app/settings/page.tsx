import { redirect } from "next/navigation";
import { Building2, DatabaseZap, Globe2, ReceiptText, UserCircle2 } from "lucide-react";
import { BusinessSettingsPanel } from "@/components/business-settings-panel";
import { SectionCard } from "@/components/section-card";
import { TaxSettingsPanel } from "@/components/tax-settings-panel";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getAuthSession } from "@/lib/auth";
import { getBookings, getExpenses, getLatestImport, getUserSettings } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { getDefaultTaxRateByCountry } from "@/lib/tax";
import { getMarketDefinition } from "@/lib/markets";

export const runtime = "nodejs";

export default async function SettingsPage() {
  const session = await getAuthSession();
  const ownerEmail = session?.user?.email?.toLowerCase();

  if (!session?.user?.email || !ownerEmail) {
    redirect("/login");
  }

  const userName = session.user.name ?? session.user.email ?? "Host";
  const bookings = await getBookings(ownerEmail);
  const expenses = await getExpenses(ownerEmail);
  const latestImport = await getLatestImport(ownerEmail);
  const userSettings = await getUserSettings(ownerEmail, userName);
  const primaryMarket = getMarketDefinition(userSettings.primaryCountryCode);
  const taxMarket = getMarketDefinition(userSettings.taxCountryCode);
  const taxRateIsCustom = userSettings.taxRate !== getDefaultTaxRateByCountry(userSettings.taxCountryCode);

  return (
    <WorkspaceShell
      activePage="settings"
      pageTitle="Settings"
      pageSubtitle="Set the defaults Hostlyx uses for reporting, markets, and tax estimation."
      businessName={userSettings.businessName}
      userName={userName}
      userEmail={ownerEmail}
      currencyCode={userSettings.currencyCode}
      latestImport={latestImport}
    >
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <SectionCard
          title="Account Overview"
          subtitle="This account is isolated from every other host workspace in the system."
        >
          <div className="space-y-4">
            <div className="workspace-soft-card rounded-[24px] p-4">
              <div className="flex items-center gap-3">
                <div className="workspace-icon-chip rounded-2xl p-3">
                  <UserCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--workspace-text)]">{userName}</p>
                  <p className="text-sm text-[var(--workspace-muted)]">{ownerEmail}</p>
                </div>
              </div>
            </div>

            <div className="workspace-soft-card rounded-[24px] p-4">
              <div className="flex items-center gap-3">
                <div className="workspace-icon-chip rounded-2xl p-3">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--workspace-text)]">{userSettings.businessName}</p>
                  <p className="text-sm text-[var(--workspace-muted)]">Business name shown across the app</p>
                </div>
              </div>
            </div>

            <div className="workspace-soft-card rounded-[24px] p-4">
              <div className="flex items-center gap-3">
                <div className="workspace-icon-chip rounded-2xl p-3">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--workspace-text)]">
                    {primaryMarket.countryName} • {primaryMarket.currencyCode}
                  </p>
                  <p className="text-sm text-[var(--workspace-muted)]">
                    Default market used when reports include several countries at once
                  </p>
                </div>
              </div>
            </div>

            <div className="workspace-soft-card rounded-[24px] p-4">
              <div className="flex items-center gap-3">
                <div className="workspace-icon-chip rounded-2xl p-3">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--workspace-text)]">
                    {taxMarket.countryName} • {userSettings.taxRate}%
                  </p>
                  <p className="text-sm text-[var(--workspace-muted)]">
                    {taxRateIsCustom ? "Custom tax default saved for Settings" : "Default estimate currently in use"}
                  </p>
                </div>
              </div>
            </div>

            <div className="workspace-soft-card rounded-[24px] p-4">
              <div className="flex items-center gap-3">
                <div className="workspace-icon-chip rounded-2xl p-3">
                  <DatabaseZap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--workspace-text)]">
                    {formatNumber(bookings.length + expenses.length)} total saved records
                  </p>
                  <p className="text-sm text-[var(--workspace-muted)]">
                    {formatNumber(bookings.length)} bookings and {formatNumber(expenses.length)} expenses in your workspace
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <BusinessSettingsPanel
            initialBusinessName={userSettings.businessName}
            initialPrimaryCountryCode={userSettings.primaryCountryCode}
          />
          <TaxSettingsPanel
            initialTaxCountryCode={userSettings.taxCountryCode}
            initialTaxRate={userSettings.taxRate}
          />
        </div>
      </div>
    </WorkspaceShell>
  );
}
