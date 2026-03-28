import { redirect } from "next/navigation";
import { FileSpreadsheet, Layers3 } from "lucide-react";
import { ImportsManager } from "@/components/imports-manager";
import { SectionCard } from "@/components/section-card";
import { UploadPanel } from "@/components/upload-panel";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getAuthSession } from "@/lib/auth";
import {
  getImportSummaries,
  getLatestImport,
  getPropertyDefinitions,
  getUserSettings,
} from "@/lib/db";
import { formatNumber } from "@/lib/format";

export const runtime = "nodejs";

export default async function ImportsPage() {
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

  const [importSummaries, latestImport, userSettings] = await Promise.all([
    getImportSummaries(ownerEmail),
    getLatestImport(ownerEmail),
    getUserSettings(ownerEmail, userName),
  ]);
  const totalImportedBookings = importSummaries.reduce(
    (sum, entry) => sum + entry.bookingsCount,
    0,
  );
  const totalImportedExpenses = importSummaries.reduce(
    (sum, entry) => sum + entry.expensesCount,
    0,
  );

  return (
    <WorkspaceShell
      activePage="imports"
      pageTitle="Import Center"
      pageSubtitle="Bring your files into Hostlyx, review the data calmly, and update your financial view with confidence."
      businessName={userSettings.businessName}
      userName={userName}
      userEmail={ownerEmail}
      currencyCode={userSettings.currencyCode}
      latestImport={latestImport}
    >
      <div className="space-y-6">
        <UploadPanel properties={properties} />

        <div className="grid gap-4 md:grid-cols-3">
          <SectionCard title="Imported files">
            <div className="flex items-center gap-3">
              <div className="workspace-icon-chip rounded-2xl p-3">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <p className="text-2xl font-semibold text-[var(--workspace-text)]">
                {formatNumber(importSummaries.length)}
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Records now in Hostlyx">
            <div className="flex items-center gap-3">
              <div className="workspace-icon-chip rounded-2xl p-3">
                <Layers3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--workspace-text)]">
                  {formatNumber(totalImportedBookings + totalImportedExpenses)}
                </p>
                <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                  {formatNumber(totalImportedBookings)} bookings and {formatNumber(totalImportedExpenses)} expenses
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Properties touched">
            <div className="flex items-center gap-3">
              <div className="workspace-icon-chip rounded-2xl p-3">
                <Layers3 className="h-5 w-5" />
              </div>
              <p className="text-2xl font-semibold text-[var(--workspace-text)]">
                {formatNumber(new Set(importSummaries.map((entry) => entry.propertyName)).size)}
              </p>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="How to think about it">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <p className="text-sm leading-6 text-[var(--workspace-muted)]">
              Use this page as your import control center. Review what landed, keep the audit trail clean, and treat the imported records as live app data once they are inside Hostlyx.
            </p>
            <div className="workspace-soft-card rounded-[22px] px-4 py-4 text-sm leading-6 text-[var(--workspace-muted)]">
              Each file below stays visible as import history so you can understand what changed, when it landed, and which records it created.
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Backup & Audit Trail"
          subtitle="Each batch below shows which property it entered, when it landed, and how many live records it created inside Hostlyx."
        >
          <ImportsManager importSummaries={importSummaries} />
        </SectionCard>
      </div>
    </WorkspaceShell>
  );
}
