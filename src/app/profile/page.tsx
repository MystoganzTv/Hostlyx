import { redirect } from "next/navigation";
import { Building2, DatabaseZap, Globe2, UserCircle2 } from "lucide-react";
import { BusinessSettingsPanel } from "@/components/business-settings-panel";
import { SectionCard } from "@/components/section-card";
import { WorkspaceHeader } from "@/components/workspace-header";
import { getAuthSession } from "@/lib/auth";
import { getBookings, getExpenses, getLatestImport, getUserSettings } from "@/lib/db";
import { formatNumber } from "@/lib/format";

export const runtime = "nodejs";

export default async function ProfilePage() {
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8 xl:px-8">
      <WorkspaceHeader
        activePage="profile"
        businessName={userSettings.businessName}
        userName={userName}
        userEmail={ownerEmail}
        currencyCode={userSettings.currencyCode}
        latestImport={latestImport}
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard
          title="Account Overview"
          subtitle="This account is isolated from every other host account in the system."
        >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <UserCircle2 className="h-5 w-5 text-[var(--accent-text)]" />
                <div>
                  <p className="text-sm font-medium text-white">{userName}</p>
                  <p className="text-sm text-slate-400">{ownerEmail}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-[var(--accent-text)]" />
                <div>
                  <p className="text-sm font-medium text-white">{userSettings.businessName}</p>
                  <p className="text-sm text-slate-400">Business name shown across the app</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <Globe2 className="h-5 w-5 text-[var(--accent-text)]" />
                <div>
                  <p className="text-sm font-medium text-white">{userSettings.currencyCode}</p>
                  <p className="text-sm text-slate-400">Currency for cards, charts, tables, and reports</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <DatabaseZap className="h-5 w-5 text-[var(--accent-text)]" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {formatNumber(bookings.length + expenses.length)} total saved records
                  </p>
                  <p className="text-sm text-slate-400">
                    {formatNumber(bookings.length)} bookings and {formatNumber(expenses.length)} expenses in your workspace
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <BusinessSettingsPanel
          initialBusinessName={userSettings.businessName}
          initialCurrencyCode={userSettings.currencyCode}
        />
      </div>
    </main>
  );
}
