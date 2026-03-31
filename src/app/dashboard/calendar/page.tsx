import {
  eachMonthOfInterval,
  format,
  parseISO,
} from "date-fns";
import { redirect } from "next/navigation";
import { CalendarAutoSync } from "@/components/calendar-auto-sync";
import { CalendarFeedsPanel } from "@/components/calendar-feeds-panel";
import { CalendarPanel } from "@/components/calendar-panel";
import { CalendarIcalLauncher } from "@/components/calendar-ical-launcher";
import { FilterBar } from "@/components/filter-bar";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getAuthSession } from "@/lib/auth";
import { getDashboardFilters } from "@/lib/dashboard";
import {
  getBookings,
  getCalendarEvents,
  getCalendarClosures,
  getIcalFeeds,
  getLatestImport,
  getPropertyDefinitions,
  getUserSettings,
} from "@/lib/db";
import { getCurrencyForCountry } from "@/lib/markets";

export const runtime = "nodejs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CALENDAR_STREAM_PAST_YEARS = 8;
const CALENDAR_STREAM_FUTURE_YEARS = 8;

function getCalendarTimelineBounds(
  bookings: Awaited<ReturnType<typeof getBookings>>,
  calendarEvents: Awaited<ReturnType<typeof getCalendarEvents>>,
  closures: Awaited<ReturnType<typeof getCalendarClosures>>,
) {
  const today = new Date();
  const allDates = [
    ...bookings.map((booking) => parseISO(booking.checkIn)),
    ...bookings.map((booking) => parseISO(booking.checkout)),
    ...calendarEvents.map((event) => parseISO(event.startDate)),
    ...calendarEvents.map((event) => parseISO(event.endDate)),
    ...closures.map((closure) => parseISO(closure.date)),
  ].filter((date) => !Number.isNaN(date.getTime()));
  const fallbackYear = today.getFullYear();
  const sortedDates = allDates.sort((left, right) => left.getTime() - right.getTime());
  const earliestYear = sortedDates[0]?.getFullYear() ?? fallbackYear;
  const latestYear = sortedDates.at(-1)?.getFullYear() ?? fallbackYear;

  return {
    startYear: Math.min(fallbackYear - CALENDAR_STREAM_PAST_YEARS, earliestYear),
    endYear: Math.max(fallbackYear + CALENDAR_STREAM_FUTURE_YEARS, latestYear),
  };
}

function getCalendarMonthAnchors(
  bookings: Awaited<ReturnType<typeof getBookings>>,
  calendarEvents: Awaited<ReturnType<typeof getCalendarEvents>>,
  closures: Awaited<ReturnType<typeof getCalendarClosures>>,
  year: number | "all",
  month: number | "all",
) {
  if (year !== "all" && month !== "all") {
    return [new Date(year, month - 1, 1)];
  }

  if (year !== "all") {
    return eachMonthOfInterval({
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 1),
    });
  }

  const { startYear, endYear } = getCalendarTimelineBounds(bookings, calendarEvents, closures);
  const availableYears = Array.from(
    { length: endYear - startYear + 1 },
    (_, index) => startYear + index,
  );

  if (month !== "all") {
    return availableYears.map((availableYear) => new Date(availableYear, month - 1, 1));
  }

  return eachMonthOfInterval({
    start: new Date(startYear, 0, 1),
    end: new Date(endYear, 11, 1),
  });
}

function resolveCalendarYear(
  searchParams: Record<string, string | string[] | undefined>,
  availableYears: number[],
) {
  const currentYear = new Date().getFullYear();
  const defaultYear = availableYears.includes(currentYear) ? currentYear : availableYears[0] ?? currentYear;
  const yearParam = Array.isArray(searchParams.year) ? searchParams.year[0] : searchParams.year;

  if (yearParam === "all") {
    return "all" as const;
  }

  const parsedYear = Number(yearParam);
  return Number.isInteger(parsedYear) ? parsedYear : defaultYear;
}

function resolveCalendarMonth(searchParams: Record<string, string | string[] | undefined>) {
  const monthParam = Array.isArray(searchParams.month) ? searchParams.month[0] : searchParams.month;

  if (monthParam === "all") {
    return "all" as const;
  }

  const parsedMonth = Number(monthParam);
  return Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : "all";
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

  const [bookings, calendarEvents, closures, latestImport, userSettings, resolvedSearchParams, icalFeeds] = await Promise.all([
    getBookings(ownerEmail),
    getCalendarEvents(ownerEmail),
    getCalendarClosures(ownerEmail),
    getLatestImport(ownerEmail),
    getUserSettings(ownerEmail, userName),
    searchParams,
    getIcalFeeds(ownerEmail),
  ]);

  const filters = getDashboardFilters(
    resolvedSearchParams,
    bookings,
    [],
    properties,
    userSettings.primaryCountryCode,
  );
  const { startYear, endYear } = getCalendarTimelineBounds(bookings, calendarEvents, closures);
  const availableCalendarYears = Array.from(
    { length: endYear - startYear + 1 },
    (_, index) => endYear - index,
  );
  const selectedCalendarYear = resolveCalendarYear(resolvedSearchParams, availableCalendarYears);
  const selectedCalendarMonth = resolveCalendarMonth(resolvedSearchParams);
  const propertyCountryMap = new Map(
    properties.map((property) => [property.name.trim().toLowerCase(), property.countryCode]),
  );

  const countryAndChannelBookings = bookings.filter((booking) => {
    const countryCode =
      propertyCountryMap.get(booking.propertyName.trim().toLowerCase()) ??
      userSettings.primaryCountryCode;

    return (
      (filters.countryCode === "all" || countryCode === filters.countryCode) &&
      (filters.channel === "all" || booking.channel === filters.channel)
    );
  });

  const countryClosures = closures.filter((closure) => {
    const countryCode =
      propertyCountryMap.get(closure.propertyName.trim().toLowerCase()) ??
      userSettings.primaryCountryCode;

    return filters.countryCode === "all" || countryCode === filters.countryCode;
  });

  const countryCalendarEvents = calendarEvents.filter((event) => {
    const countryCode =
      propertyCountryMap.get(event.propertyName.trim().toLowerCase()) ??
      userSettings.primaryCountryCode;

    return filters.countryCode === "all" || countryCode === filters.countryCode;
  });

  const monthAnchors = getCalendarMonthAnchors(
    countryAndChannelBookings,
    countryCalendarEvents,
    countryClosures,
    selectedCalendarYear,
    selectedCalendarMonth,
  );
  const calendarViewKey = `${selectedCalendarYear}-${selectedCalendarMonth}-${filters.countryCode}-${filters.channel}`;
  const hasLegacySyncedEventDetails = calendarEvents.some(
    (event) => event.icalFeedId && !event.description.trim(),
  );

  const displayCountryCode =
    filters.countryCode === "all" ? userSettings.primaryCountryCode : filters.countryCode;
  const currencyCode = getCurrencyForCountry(displayCountryCode);
  const hasScopedFilters = filters.countryCode !== "all" || filters.channel !== "all";
  const rangeLabel =
    selectedCalendarYear === "all"
      ? selectedCalendarMonth === "all"
        ? hasScopedFilters
          ? "Filtered history"
          : "Imported history"
        : `Every ${format(new Date(2000, selectedCalendarMonth - 1, 1), "MMMM")}`
      : selectedCalendarMonth === "all"
        ? String(selectedCalendarYear)
        : format(new Date(selectedCalendarYear, selectedCalendarMonth - 1, 1), "MMMM yyyy");

  return (
    <WorkspaceShell
      activePage="calendar"
      pageTitle="Calendar"
      pageSubtitle="See bookings, check-ins, check-outs, and closed days month by month, and connect iCal feeds per listing."
      businessName={userSettings.businessName}
      userName={userName}
      userEmail={ownerEmail}
      currencyCode={currencyCode}
      latestImport={latestImport}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <FilterBar
            mode="calendar"
            years={availableCalendarYears}
            channels={Array.from(new Set(bookings.map((booking) => booking.channel))).sort((a, b) =>
              a.localeCompare(b),
            )}
            countries={Array.from(new Set(properties.map((property) => property.countryCode)))}
            selectedYear={selectedCalendarYear}
            selectedMonth={selectedCalendarMonth}
            selectedChannel={filters.channel}
            selectedCountryCode={filters.countryCode}
          />
          <CalendarIcalLauncher properties={properties} />
        </div>
      }
    >
      <div className="space-y-6">
        <CalendarAutoSync
          enabled={icalFeeds.some((feed) => feed.isActive)}
          force={hasLegacySyncedEventDetails}
        />
        <CalendarFeedsPanel feeds={icalFeeds} />
        <CalendarPanel
          key={calendarViewKey}
          rangeLabel={rangeLabel}
          bookings={countryAndChannelBookings}
          calendarEvents={countryCalendarEvents}
          closures={countryClosures}
          monthAnchors={monthAnchors}
          currencyCode={currencyCode}
        />
      </div>
    </WorkspaceShell>
  );
}
