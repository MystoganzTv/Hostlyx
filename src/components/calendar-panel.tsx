import {
  eachMonthOfInterval,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from "date-fns";
import { formatNumber } from "@/lib/format";
import { SectionCard } from "@/components/section-card";
import type {
  BookingRecord,
  CalendarClosureRecord,
} from "@/lib/types";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildCalendarDays(anchor: Date) {
  const monthStart = startOfMonth(anchor);
  const startOffset = getDay(monthStart);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startOffset);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);

  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

function MonthCalendar({
  anchorDate,
  bookings,
  closures,
}: {
  anchorDate: Date;
  bookings: BookingRecord[];
  closures: CalendarClosureRecord[];
}) {
  const days = buildCalendarDays(anchorDate);
  const monthLabel = format(anchorDate, "MMMM yyyy");
  const monthKey = format(anchorDate, "yyyy-MM");
  const checkIns = bookings.filter((booking) => booking.checkIn.startsWith(monthKey));
  const checkOuts = bookings.filter((booking) => booking.checkout.startsWith(monthKey));
  const monthClosures = closures.filter((closure) => closure.date.startsWith(monthKey));

  return (
    <SectionCard
      title={monthLabel}
      subtitle={`${formatNumber(checkIns.length)} check-ins, ${formatNumber(checkOuts.length)} check-outs, ${formatNumber(monthClosures.length)} closed days`}
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[860px] grid-cols-7 gap-2">
          {weekdayLabels.map((label) => (
            <div
              key={`${monthKey}-${label}`}
              className="px-2 pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]"
            >
              {label}
            </div>
          ))}

          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayBookings = bookings.filter(
              (booking) => booking.checkIn <= dayKey && booking.checkout > dayKey,
            );
            const dayCheckIns = bookings.filter((booking) => booking.checkIn === dayKey);
            const dayCheckOuts = bookings.filter((booking) => booking.checkout === dayKey);
            const dayClosure = closures.find((closure) => closure.date === dayKey);

            return (
              <article
                key={dayKey}
                className={`min-h-[160px] rounded-[22px] border p-3 ${
                  isSameMonth(day, anchorDate)
                    ? "workspace-soft-card"
                    : "border-[var(--workspace-border)] bg-[rgba(10,21,36,0.46)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${isSameMonth(day, anchorDate) ? "text-[var(--workspace-text)]" : "text-[var(--workspace-muted)]"}`}>
                    {format(day, "d")}
                  </p>
                  {dayClosure ? (
                    <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-200">
                      Closed
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2">
                  {dayCheckIns.map((booking) => (
                    <div key={`in-${booking.id ?? booking.guestName}-${dayKey}`} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Check-in</p>
                      <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">{booking.guestName}</p>
                    </div>
                  ))}

                  {dayBookings
                    .filter((booking) => booking.checkIn !== dayKey)
                    .slice(0, 2)
                    .map((booking) => (
                      <div key={`stay-${booking.id ?? booking.guestName}-${dayKey}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted)]">Booked</p>
                        <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">{booking.guestName}</p>
                        <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                          {booking.channel} • {formatNumber(booking.nights)} nights
                        </p>
                      </div>
                    ))}

                  {dayBookings.length > 2 ? (
                    <p className="text-xs text-[var(--workspace-muted)]">
                      +{dayBookings.length - 2} more stays
                    </p>
                  ) : null}

                  {dayCheckOuts.map((booking) => (
                    <div key={`out-${booking.id ?? booking.guestName}-${dayKey}`} className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">Check-out</p>
                      <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">{booking.guestName}</p>
                    </div>
                  ))}

                  {dayClosure ? (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-200">
                        {dayClosure.reason}
                      </p>
                      {dayClosure.note ? (
                        <p className="mt-1 whitespace-pre-line text-xs text-rose-100/90">{dayClosure.note}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function getMonthAnchors(
  bookings: BookingRecord[],
  closures: CalendarClosureRecord[],
  selectedYear: number | "all",
  selectedMonth: number | "all",
) {
  if (selectedYear !== "all" && selectedMonth !== "all") {
    return [new Date(selectedYear, selectedMonth - 1, 1)];
  }

  if (selectedYear !== "all") {
    return Array.from({ length: 12 }, (_, index) => new Date(selectedYear, index, 1));
  }

  const allDates = [
    ...bookings.map((booking) => parseISO(booking.checkIn)),
    ...closures.map((closure) => parseISO(closure.date)),
  ].filter((date) => !Number.isNaN(date.getTime()));

  if (allDates.length === 0) {
    return [startOfMonth(new Date())];
  }

  const sortedDates = allDates.sort((left, right) => left.getTime() - right.getTime());

  return eachMonthOfInterval({
    start: startOfMonth(sortedDates[0]),
    end: startOfMonth(sortedDates.at(-1) ?? new Date()),
  });
}

function intersectsMonth(booking: BookingRecord, anchorDate: Date) {
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const stayStart = parseISO(booking.checkIn);
  const stayEnd = parseISO(booking.checkout);

  return stayStart <= monthEnd && stayEnd > monthStart;
}

export function CalendarPanel({
  rangeLabel,
  bookings,
  closures,
  selectedYear,
  selectedMonth,
}: {
  rangeLabel: string;
  bookings: BookingRecord[];
  closures: CalendarClosureRecord[];
  selectedYear: number | "all";
  selectedMonth: number | "all";
}) {
  const monthAnchors = getMonthAnchors(bookings, closures, selectedYear, selectedMonth);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="workspace-card rounded-[24px] p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Range</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">{rangeLabel}</p>
        </div>
        <div className="workspace-card rounded-[24px] p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Months visible</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">{formatNumber(monthAnchors.length)}</p>
        </div>
        <div className="workspace-card rounded-[24px] p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Check-ins</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">{formatNumber(bookings.length)}</p>
        </div>
        <div className="workspace-card rounded-[24px] p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Closed days</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">{formatNumber(closures.length)}</p>
        </div>
      </div>

      <div className="grid gap-6">
        {monthAnchors.map((anchorDate) => {
          const monthKey = format(anchorDate, "yyyy-MM");
          const monthBookings = bookings.filter((booking) => intersectsMonth(booking, anchorDate));
          const monthClosures = closures.filter((closure) =>
            isWithinInterval(parseISO(closure.date), {
              start: startOfMonth(anchorDate),
              end: endOfMonth(anchorDate),
            }),
          );

          return (
            <MonthCalendar
              key={monthKey}
              anchorDate={anchorDate}
              bookings={monthBookings}
              closures={monthClosures}
            />
          );
        })}
      </div>
    </div>
  );
}
