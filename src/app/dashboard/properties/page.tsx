import { redirect } from "next/navigation";
import { Building2, Home, Layers3 } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { WorkspaceHeader } from "@/components/workspace-header";
import { getAuthSession } from "@/lib/auth";
import { getBookings, getExpenses, getLatestImport, getUserSettings } from "@/lib/db";
import { formatCurrency, formatNumber } from "@/lib/format";

export const runtime = "nodejs";

export default async function PropertiesPage() {
  const session = await getAuthSession();
  const ownerEmail = session?.user?.email?.toLowerCase();

  if (!session?.user?.email || !ownerEmail) {
    redirect("/login");
  }

  const userName = session.user.name ?? session.user.email ?? "Host";
  const [bookings, expenses, latestImport, userSettings] = await Promise.all([
    getBookings(ownerEmail),
    getExpenses(ownerEmail),
    getLatestImport(ownerEmail),
    getUserSettings(ownerEmail, userName),
  ]);

  const propertyMap = new Map<
    string,
    {
      units: Set<string>;
      bookings: number;
      expenses: number;
      revenue: number;
      payout: number;
    }
  >();

  for (const booking of bookings) {
    const current = propertyMap.get(booking.propertyName) ?? {
      units: new Set<string>(),
      bookings: 0,
      expenses: 0,
      revenue: 0,
      payout: 0,
    };

    if (booking.unitName) {
      current.units.add(booking.unitName);
    }

    current.bookings += 1;
    current.revenue += booking.totalRevenue;
    current.payout += booking.payout;
    propertyMap.set(booking.propertyName, current);
  }

  for (const expense of expenses) {
    const current = propertyMap.get(expense.propertyName) ?? {
      units: new Set<string>(),
      bookings: 0,
      expenses: 0,
      revenue: 0,
      payout: 0,
    };

    if (expense.unitName) {
      current.units.add(expense.unitName);
    }

    current.expenses += expense.amount;
    propertyMap.set(expense.propertyName, current);
  }

  const properties = Array.from(propertyMap.entries()).map(([name, value]) => ({
    name,
    units: value.units,
    bookings: value.bookings,
    revenue: value.revenue,
    payout: value.payout,
    expenses: value.expenses,
    profit: value.payout - value.expenses,
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8 xl:px-8">
      <WorkspaceHeader
        activePage="properties"
        businessName={userSettings.businessName}
        userName={userName}
        userEmail={ownerEmail}
        currencyCode={userSettings.currencyCode}
        latestImport={latestImport}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Properties">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-[var(--accent-text)]" />
            <p className="text-2xl font-semibold text-white">{formatNumber(properties.length)}</p>
          </div>
        </SectionCard>
        <SectionCard title="Units">
          <div className="flex items-center gap-3">
            <Layers3 className="h-5 w-5 text-[var(--accent-text)]" />
            <p className="text-2xl font-semibold text-white">
              {formatNumber(properties.reduce((sum, property) => sum + property.units.size, 0))}
            </p>
          </div>
        </SectionCard>
        <SectionCard title="How to use it">
          <p className="text-sm leading-6 text-slate-400">
            Imported files default to `Default Property`. Use the Bookings and Expenses pages to reassign rows to the right property and unit.
          </p>
        </SectionCard>
      </div>

      <SectionCard
        title="Property Summary"
        subtitle="A lightweight view of how your records are distributed across properties and units."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {properties.map((property) => (
            <article key={property.name} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-white">{property.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {property.units.size > 0
                      ? `${formatNumber(property.units.size)} units`
                      : "No units assigned yet"}
                  </p>
                </div>
                <Home className="h-5 w-5 text-[var(--accent-text)]" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Bookings</p>
                  <p className="mt-1 text-sm font-medium text-white">{formatNumber(property.bookings)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Expenses</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {formatCurrency(property.expenses, false, userSettings.currencyCode)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payout</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {formatCurrency(property.payout, false, userSettings.currencyCode)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Profit</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {formatCurrency(property.profit, false, userSettings.currencyCode)}
                  </p>
                </div>
              </div>

              {property.units.size > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from(property.units).map((unit) => (
                    <span
                      key={unit}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300"
                    >
                      {unit}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </SectionCard>
    </main>
  );
}
