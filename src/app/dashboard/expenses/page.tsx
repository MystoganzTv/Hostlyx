import { redirect } from "next/navigation";
import { ReceiptText, Wallet } from "lucide-react";
import { ExpensesManager } from "@/components/expenses-manager";
import { SectionCard } from "@/components/section-card";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getAuthSession } from "@/lib/auth";
import {
  getExpenses,
  getLatestImport,
  getPropertyDefinitions,
  getUserSettings,
} from "@/lib/db";
import { formatCurrency, formatNumber } from "@/lib/format";

export const runtime = "nodejs";

export default async function ExpensesPage() {
  const session = await getAuthSession();
  const ownerEmail = session?.user?.email?.toLowerCase();

  if (!session?.user?.email || !ownerEmail) {
    redirect("/login");
  }

  const userName = session.user.name ?? session.user.email ?? "Host";
  const [expenses, latestImport, userSettings, properties] = await Promise.all([
    getExpenses(ownerEmail),
    getLatestImport(ownerEmail),
    getUserSettings(ownerEmail, userName),
    getPropertyDefinitions(ownerEmail),
  ]);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <WorkspaceShell
      activePage="expenses"
      pageTitle="Expenses"
      pageSubtitle="Track operating costs, categories, and property-level spend."
      businessName={userSettings.businessName}
      userName={userName}
      userEmail={ownerEmail}
      currencyCode={userSettings.currencyCode}
      latestImport={latestImport}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <SectionCard title="Total expenses">
            <div className="flex items-center gap-3">
              <div className="workspace-icon-chip rounded-2xl p-3">
                <Wallet className="h-5 w-5" />
              </div>
              <p className="text-2xl font-semibold text-[var(--workspace-text)]">
                {formatCurrency(totalExpenses, false, userSettings.currencyCode)}
              </p>
            </div>
          </SectionCard>
          <SectionCard title="Expense rows">
            <div className="flex items-center gap-3">
              <div className="workspace-icon-chip rounded-2xl p-3">
                <ReceiptText className="h-5 w-5" />
              </div>
              <p className="text-2xl font-semibold text-[var(--workspace-text)]">
                {formatNumber(expenses.length)}
              </p>
            </div>
          </SectionCard>
          <SectionCard title="Editing">
            <p className="text-sm leading-6 text-[var(--workspace-muted)]">
              Reclassify categories, move expenses to the right property, and clean notes directly inside the app.
            </p>
          </SectionCard>
        </div>

        <SectionCard
          title="All Expenses"
          subtitle="Every expense saved in this business account, including imports and manual entries."
        >
          <ExpensesManager
            expenses={expenses}
            currencyCode={userSettings.currencyCode}
            properties={properties}
          />
        </SectionCard>
      </div>
    </WorkspaceShell>
  );
}
