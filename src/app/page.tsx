import { redirect } from "next/navigation";
import { buildDashboardView, getDashboardFilters } from "@/lib/dashboard";
import { getBookings, getExpenses, getLatestImport } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export const runtime = "nodejs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({
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

  const bookings = await getBookings(ownerEmail);
  const expenses = await getExpenses(ownerEmail);
  const latestImport = await getLatestImport(ownerEmail);
  const resolvedSearchParams = await searchParams;
  const filters = getDashboardFilters(resolvedSearchParams, bookings, expenses);
  const view = buildDashboardView({
    bookings,
    expenses,
    filters,
  });
  const manualBookingsCount = bookings.filter((booking) => booking.source === "manual").length;
  const manualExpensesCount = expenses.filter((expense) => expense.source === "manual").length;
  const importedBookingsCount = bookings.length - manualBookingsCount;
  const importedExpensesCount = expenses.length - manualExpensesCount;

  return (
    <DashboardShell
      view={view}
      latestImport={latestImport}
      userName={userName}
      userEmail={ownerEmail}
      manualBookingsCount={manualBookingsCount}
      manualExpensesCount={manualExpensesCount}
      importedBookingsCount={importedBookingsCount}
      importedExpensesCount={importedExpensesCount}
    />
  );
}
