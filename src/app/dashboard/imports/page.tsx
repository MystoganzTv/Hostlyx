import { redirect } from "next/navigation";
import { DatabaseZap, FileSpreadsheet, Layers3 } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getAuthSession } from "@/lib/auth";
import {
  getImportSummaries,
  getLatestImport,
  getPropertyDefinitions,
  getUserSettings,
} from "@/lib/db";
import { formatDateLabel, formatNumber } from "@/lib/format";

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
      pageTitle="Import History"
      pageSubtitle="Excel files are treated as one-time intake. After import, your source of truth lives inside Hostlyx."
      businessName={userSettings.businessName}
      userName={userName}
      userEmail={ownerEmail}
      currencyCode={userSettings.currencyCode}
      latestImport={latestImport}
    >
      <div className="space-y-6">
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
              Use this page as audit trail and backup history. Once a workbook is imported, you should think of the records as app data, not as something still owned by the spreadsheet.
            </p>
            <div className="workspace-soft-card rounded-[22px] px-4 py-4 text-sm leading-6 text-[var(--workspace-muted)]">
              Import is a secondary workflow in Hostlyx. Day to day, your source of truth should be the bookings, expenses, properties, and edits that live inside the app.
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Backup & Audit Trail"
          subtitle="Each batch below shows which property it entered, when it landed, and how many live records it created inside Hostlyx."
        >
          {importSummaries.length === 0 ? (
            <div className="workspace-soft-card rounded-[22px] p-5 text-sm text-[var(--workspace-muted)]">
              No imports yet. When you upload Excel files, Hostlyx will keep the history here for backup context and traceability.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">File</th>
                    <th className="pb-3 pr-4 font-medium">Property</th>
                    <th className="pb-3 pr-4 font-medium">Imported</th>
                    <th className="pb-3 pr-4 font-medium">Bookings</th>
                    <th className="pb-3 font-medium">Expenses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--workspace-border)] text-[var(--workspace-text)]">
                  {importSummaries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-4 pr-4">
                        <div className="flex items-start gap-3">
                          <div className="workspace-icon-chip rounded-2xl p-2.5">
                            <DatabaseZap className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{entry.fileName}</p>
                            <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                              {entry.source}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">{entry.propertyName}</td>
                      <td className="py-4 pr-4">{formatDateLabel(entry.importedAt.slice(0, 10))}</td>
                      <td className="py-4 pr-4">{formatNumber(entry.bookingsCount)}</td>
                      <td className="py-4">{formatNumber(entry.expensesCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </WorkspaceShell>
  );
}
