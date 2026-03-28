import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  isWithinInterval,
  max,
  min,
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

function chunkWeeks(days: Date[]) {
  const weeks: Date[][] = [];

  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return weeks;
}

function getBookingTone(channel: string) {
  const normalized = channel.trim().toLowerCase();

  if (normalized.includes("airbnb")) {
    return "border-emerald-300/18 bg-[linear-gradient(180deg,rgba(88,196,182,0.22)_0%,rgba(38,76,91,0.78)_100%)] text-white";
  }

  if (normalized.includes("booking")) {
    return "border-sky-300/18 bg-[linear-gradient(180deg,rgba(92,153,255,0.22)_0%,rgba(28,45,82,0.82)_100%)] text-white";
  }

  if (normalized.includes("direct")) {
    return "border-amber-200/16 bg-[linear-gradient(180deg,rgba(244,198,105,0.18)_0%,rgba(77,58,29,0.82)_100%)] text-white";
  }

  return "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(31,41,55,0.88)_100%)] text-white";
}

function getGuestLabel(booking: BookingRecord) {
  const primary = booking.guestName.trim().split(/\s+/)[0] || "Guest";
  const extraGuests = Math.max(0, booking.guestCount - 1);

  return extraGuests > 0 ? `${primary} + ${extraGuests}` : primary;
}

function intersectsMonth(booking: BookingRecord, anchorDate: Date) {
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const stayStart = parseISO(booking.checkIn);
  const stayEnd = parseISO(booking.checkout);

  return stayStart <= monthEnd && stayEnd > monthStart;
}

function buildWeekBookingSegments(weekDays: Date[], bookings: BookingRecord[]) {
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekEndExclusive = addDays(weekEnd, 1);

  const visibleBookings = bookings
    .filter((booking) => {
      const stayStart = parseISO(booking.checkIn);
      const stayEnd = parseISO(booking.checkout);
      return stayStart < weekEndExclusive && stayEnd > weekStart;
    })
    .sort((left, right) => {
      if (left.checkIn !== right.checkIn) {
        return left.checkIn.localeCompare(right.checkIn);
      }

      return left.checkout.localeCompare(right.checkout);
    });

  const trackEnds: number[] = [];

  const segments = visibleBookings.map((booking) => {
    const stayStart = parseISO(booking.checkIn);
    const stayEnd = parseISO(booking.checkout);
    const segmentStart = max([stayStart, weekStart]);
    const segmentEnd = min([stayEnd, weekEndExclusive]);
    const startIndex = differenceInCalendarDays(segmentStart, weekStart);
    const span = Math.max(1, differenceInCalendarDays(segmentEnd, segmentStart));

    let track = trackEnds.findIndex((trackEnd) => trackEnd <= startIndex);

    if (track === -1) {
      track = trackEnds.length;
      trackEnds.push(0);
    }

    trackEnds[track] = startIndex + span;

    return {
      booking,
      startIndex,
      span,
      track,
      startsThisWeek: stayStart >= weekStart && stayStart < weekEndExclusive,
      endsThisWeek: stayEnd > weekStart && stayEnd <= weekEndExclusive,
    };
  });

  return {
    segments,
    maxTracks: Math.max(segments.reduce((highest, segment) => Math.max(highest, segment.track + 1), 0), 1),
  };
}

function MonthCalendar({
  anchorDate,
  bookings,
  closures,
  compact = false,
  abbreviatedTitle = false,
}: {
  anchorDate: Date;
  bookings: BookingRecord[];
  closures: CalendarClosureRecord[];
  compact?: boolean;
  abbreviatedTitle?: boolean;
}) {
  const days = buildCalendarDays(anchorDate);
  const weeks = chunkWeeks(days);
  const monthLabel = format(anchorDate, abbreviatedTitle ? "MMMM" : "MMMM yyyy");
  const monthKey = format(anchorDate, "yyyy-MM");
  const checkIns = bookings.filter((booking) => booking.checkIn.startsWith(monthKey));
  const checkOuts = bookings.filter((booking) => booking.checkout.startsWith(monthKey));
  const monthClosures = closures.filter((closure) => closure.date.startsWith(monthKey));

  return (
    <SectionCard
      title={monthLabel}
      subtitle={`${formatNumber(checkIns.length)} check-ins, ${formatNumber(checkOuts.length)} check-outs, ${formatNumber(monthClosures.length)} closed days`}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-7 gap-2">
          {weekdayLabels.map((label) => (
            <div
              key={`${monthKey}-${label}`}
              className={`px-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)] ${compact ? "pb-1" : "pb-2"}`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          {weeks.map((weekDays) => {
            const { segments, maxTracks } = buildWeekBookingSegments(weekDays, bookings);
            const rowHeight = compact ? Math.max(88, 38 + maxTracks * 26) : Math.max(124, 48 + maxTracks * 32);
            const barHeight = compact ? 22 : 28;
            const overlayTop = compact ? 34 : 40;

            return (
              <div key={format(weekDays[0], "yyyy-MM-dd")} className="relative" style={{ height: rowHeight }}>
                <div className="grid h-full grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const dayClosure = closures.find((closure) => closure.date === dayKey);
                    const isCurrentMonth = isSameMonth(day, anchorDate);

                    return (
                      <article
                        key={dayKey}
                        className={`rounded-[22px] border px-3 py-2.5 ${
                          dayClosure && isCurrentMonth
                            ? "border-amber-300/14 bg-[linear-gradient(180deg,rgba(244,198,105,0.08)_0%,rgba(15,24,38,0.92)_100%)]"
                            : isCurrentMonth
                              ? "workspace-soft-card"
                              : "border-[var(--workspace-border)] bg-[rgba(10,21,36,0.42)]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`font-semibold ${compact ? "text-xs" : "text-sm"} ${
                              isCurrentMonth ? "text-[var(--workspace-text)]" : "text-[var(--workspace-muted)]"
                            }`}
                          >
                            {format(day, "d")}
                          </p>
                          {dayClosure ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-200/80" />
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="pointer-events-none absolute inset-x-0" style={{ top: overlayTop }}>
                  <div
                    className="grid grid-cols-7 gap-2"
                    style={{ gridAutoRows: `${barHeight}px` }}
                  >
                    {segments.map((segment) => (
                      <div
                        key={`${segment.booking.id ?? segment.booking.bookingNumber}-${segment.startIndex}-${segment.track}`}
                        className={`flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl border px-3 shadow-[0_10px_24px_rgba(2,6,23,0.22)] ${getBookingTone(segment.booking.channel)}`}
                        style={{
                          gridColumn: `${segment.startIndex + 1} / span ${segment.span}`,
                          gridRow: segment.track + 1,
                          height: `${barHeight}px`,
                        }}
                      >
                        {segment.startsThisWeek ? (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/85" />
                        ) : null}
                        <span className={`truncate font-medium ${compact ? "text-[11px]" : "text-xs"}`}>
                          {getGuestLabel(segment.booking)}
                        </span>
                        {!compact && segment.span > 2 ? (
                          <span className="ml-auto shrink-0 text-[11px] text-white/70">
                            {segment.booking.channel}
                          </span>
                        ) : null}
                        {segment.endsThisWeek ? (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/60" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

export function CalendarPanel({
  rangeLabel,
  bookings,
  closures,
  monthAnchors,
}: {
  rangeLabel: string;
  bookings: BookingRecord[];
  closures: CalendarClosureRecord[];
  monthAnchors: Date[];
}) {
  const showOverviewGrid = monthAnchors.length > 1;
  const isYearGrid = monthAnchors.length === 12;

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

      <div
        className={
          showOverviewGrid
            ? "grid gap-6"
            : "grid gap-6"
        }
      >
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
              compact={showOverviewGrid}
              abbreviatedTitle={isYearGrid}
            />
          );
        })}
      </div>
    </div>
  );
}
