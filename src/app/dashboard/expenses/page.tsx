import { redirect } from "next/navigation";
import { ReceiptText, Wallet } from "lucide-react";
import { ExpensesManager } from "@/components/expenses-manager";
import { SectionCard } from "@/components/section-card";
import { WorkspaceHeader } from "@/components/workspace-header";
import { getAuthSession } from "@/lib/auth";
import { getExpenses, getLatestImport, getUserSettings } from "@/lib/db";
import { formatCurrency, formatNumber } from "@/lib/format";

export const runtime = "nodejs";

export default async function ExpensesPage() {
  const session = await getAuthSession();
  const ownerEmail = session?.user?.email?.toLowerCase();

  if (!session?.user?.email || !ownerEmail) {
    redirect("/login");
  }

  const userName = session.user.name ?? session.user.email ?? "Host";
  const [expenses, latestImport, userSettings] = await Promise.all([
    getExpenses(ownerEmail),
    getLatestImport(ownerEmail),
    getUserSettings(ownerEmail, userName),
  ]);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8 xl:px-8">
      <WorkspaceHeader
        activePage="expenses"
        businessName={userSettings.businessName}
        userName={userName}
        userEmail={ownerEmail}
        currencyCode={userSettings.currencyCode}
        latestImport={latestImport}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Total expenses">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-[var(--accent-text)]" />
            <p className="text-2xl font-semibold text-white">
              {formatCurrency(totalExpenses, false, userSettings.currencyCode)}
            </p>
          </div>
        </SectionCard>
        <SectionCard title="Expense rows">
          <div className="flex items-center gap-3">
            <ReceiptText className="h-5 w-5 text-[var(--accent-text)]" />
            <p className="text-2xl font-semibold text-white">{formatNumber(expenses.length)}</p>
          </div>
        </SectionCard>
        <SectionCard title="Editing">
          <p className="text-sm leading-6 text-slate-400">
            Reclassify categories, move expenses to the right property, and clean notes directly inside the app.
          </p>
        </SectionCard>
      </div>

      <SectionCard
        title="All Expenses"
        subtitle="Every expense saved in this business account, including imports and manual entries."
      >
        <ExpensesManager expenses={expenses} currencyCode={userSettings.currencyCode} />
      </SectionCard>
    </main>
  );
}
