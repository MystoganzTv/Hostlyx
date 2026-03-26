import { redirect } from "next/navigation";
import { buildDashboardView, getDashboardFilters } from "@/lib/dashboard";
import {
  getBookings,
  getExpenses,
  getLatestImport,
  getPropertyDefinitions,
  getUserSettings,
} from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export const runtime = "nodejs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({
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
  const userSettings = await getUserSettings(ownerEmail, userName);
  const properties = await getPropertyDefinitions(ownerEmail);
  const resolvedSearchParams = await searchParams;
  const filters = getDashboardFilters(resolvedSearchParams, bookings, expenses);
  const view = buildDashboardView({
    bookings,
    expenses,
    filters,
  });

  return (
    <DashboardShell
      view={view}
      latestImport={latestImport}
      userName={userName}
      userEmail={ownerEmail}
      businessName={userSettings.businessName}
      currencyCode={userSettings.currencyCode}
      properties={properties}
    />
  );
}
