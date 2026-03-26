import { format, parseISO } from "date-fns";
import { redirect } from "next/navigation";
import { CalendarPanel } from "@/components/calendar-panel";
import { FilterBar } from "@/components/filter-bar";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getAuthSession } from "@/lib/auth";
import { getDashboardFilters } from "@/lib/dashboard";
import {
  getBookings,
  getCalendarClosures,
  getLatestImport,
  getPropertyDefinitions,
  getUserSettings,
} from "@/lib/db";
import { getCurrencyForCountry } from "@/lib/markets";

export const runtime = "nodejs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function matchesCalendarFilter(
  dateValue: string,
  year: number | "all",
  month: number | "all",
) {
  const date = parseISO(dateValue);
  const matchesYear = year === "all" || date.getFullYear() === year;
  const matchesMonth = month === "all" || date.getMonth() + 1 === month;

  return matchesYear && matchesMonth;
}

export default async function CalendarPage({
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
  const properties = await getPropertyDefinitions(ownerEmail);

  if (properties.length === 0) {
    redirect("/dashboard/properties?setup=1");
  }

  const [bookings, closures, latestImport, userSettings, resolvedSearchParams] = await Promise.all([
    getBookings(ownerEmail),
    getCalendarClosures(ownerEmail),
    getLatestImport(ownerEmail),
    getUserSettings(ownerEmail, userName),
    searchParams,
  ]);

  const baseFilters = getDashboardFilters(
    resolvedSearchParams,
    bookings,
    [],
    properties,
    userSettings.primaryCountryCode,
  );
  const filters = baseFilters;
  const propertyCountryMap = new Map(
    properties.map((property) => [property.name.trim().toLowerCase(), property.countryCode]),
  );
  const filteredBookings = bookings.filter((booking) => {
    const countryCode =
      propertyCountryMap.get(booking.propertyName.trim().toLowerCase()) ??
      userSettings.primaryCountryCode;
    return (
      countryCode === filters.countryCode || filters.countryCode === "all"
    ) && matchesCalendarFilter(booking.checkIn, filters.year, filters.month) &&
      (filters.channel === "all" || booking.channel === filters.channel);
  });
  const filteredClosures = closures.filter((closure) => {
    const countryCode =
      propertyCountryMap.get(closure.propertyName.trim().toLowerCase()) ??
      userSettings.primaryCountryCode;
    return (
      countryCode === filters.countryCode || filters.countryCode === "all"
    ) && matchesCalendarFilter(closure.date, filters.year, filters.month);
  });

  const displayCountryCode =
    filters.countryCode === "all" ? userSettings.primaryCountryCode : filters.countryCode;
  const currencyCode = getCurrencyForCountry(displayCountryCode);
  const rangeLabel =
    filters.year === "all"
      ? "All imported months"
      : filters.month === "all"
        ? String(filters.year)
        : format(new Date(filters.year, filters.month - 1, 1), "MMMM yyyy");

  return (
    <WorkspaceShell
      activePage="calendar"
      pageTitle="Calendar"
      pageSubtitle="See bookings, check-ins, check-outs, and imported closed days in one place."
      businessName={userSettings.businessName}
      userName={userName}
      userEmail={ownerEmail}
      currencyCode={currencyCode}
      latestImport={latestImport}
      actions={
        <FilterBar
          years={Array.from(
            new Set([
              ...bookings.map((booking) => parseISO(booking.checkIn).getFullYear()),
              ...closures.map((closure) => parseISO(closure.date).getFullYear()),
            ]),
          ).sort((a, b) => b - a)}
          channels={Array.from(new Set(bookings.map((booking) => booking.channel))).sort((a, b) =>
            a.localeCompare(b),
          )}
          countries={Array.from(new Set(properties.map((property) => property.countryCode)))}
          selectedYear={filters.year}
          selectedMonth={filters.month}
          selectedChannel={filters.channel}
          selectedCountryCode={filters.countryCode}
        />
      }
    >
      <CalendarPanel
        rangeLabel={rangeLabel}
        bookings={filteredBookings}
        closures={filteredClosures}
        selectedYear={filters.year}
        selectedMonth={filters.month}
      />
    </WorkspaceShell>
  );
}
