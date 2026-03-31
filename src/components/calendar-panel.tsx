"use client";

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
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookingChannelBadge, BookingStatusBadge } from "@/components/booking-badges";
import { formatCurrency, formatDateLabel, formatNumber } from "@/lib/format";
import { getBookingStatusState } from "@/lib/booking-status";
import { Modal } from "@/components/modal";
import { SectionCard } from "@/components/section-card";
import type {
  BookingRecord,
  CalendarEventRecord,
  CalendarClosureRecord,
  CurrencyCode,
} from "@/lib/types";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalendarTimelineItem = {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
  channel: string;
  variant: "financial_booking" | "calendar_booking" | "blocked_conflict";
  booking?: BookingRecord;
};

function buildCalendarDays(anchor: Date) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const startOffset = getDay(monthStart);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startOffset);
  const endOffset = 6 - getDay(monthEnd);
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(monthEnd.getDate() + endOffset);

  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

function chunkWeeks(days: Date[]) {
  const weeks: Date[][] = [];

  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return weeks;
}

function getBookingTone(channel: string, variant: CalendarTimelineItem["variant"] = "financial_booking") {
  if (variant === "blocked_conflict") {
    return "border-rose-300/22 bg-[linear-gradient(180deg,rgba(251,113,133,0.2)_0%,rgba(67,24,39,0.88)_100%)] text-white";
  }

  if (variant === "calendar_booking") {
    return "border-slate-300/18 bg-[linear-gradient(180deg,rgba(148,163,184,0.16)_0%,rgba(36,47,63,0.86)_100%)] text-slate-100";
  }

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

function buildTimelineItems(
  bookings: BookingRecord[],
  calendarEvents: CalendarEventRecord[],
) {
  const linkedCalendarEventIds = new Set(
    bookings
      .map((booking) => booking.matchedCalendarEventId)
      .filter((value): value is number => typeof value === "number" && value > 0),
  );

  const bookingItems: CalendarTimelineItem[] = bookings.map((booking) => ({
    id: `booking-${booking.id ?? booking.bookingNumber}-${booking.checkIn}`,
    startDate: booking.checkIn,
    endDate: booking.checkout,
    label: getGuestLabel(booking),
    channel: booking.channel,
    variant:
      booking.matchStatus === "conflict_blocked_calendar" ? "blocked_conflict" : "financial_booking",
    booking,
  }));

  const calendarBookingItems: CalendarTimelineItem[] = calendarEvents
    .filter(
      (event) =>
        event.eventType === "booking" &&
        !event.linkedBookingId &&
        !linkedCalendarEventIds.has(Number(event.id ?? 0)),
    )
    .map((event) => ({
      id: `calendar-${event.id ?? event.externalEventId}-${event.startDate}`,
      startDate: event.startDate,
      endDate: event.endDate,
      label: event.summary.trim() || "Calendar booking",
      channel: event.source,
      variant: "calendar_booking",
    }));

  return [...bookingItems, ...calendarBookingItems];
}

function buildBlockedDateSet(
  anchorDate: Date,
  closures: CalendarClosureRecord[],
  calendarEvents: CalendarEventRecord[],
) {
  const blockedDates = new Set(closures.map((closure) => closure.date));

  calendarEvents
    .filter((event) => event.eventType === "blocked")
    .forEach((event) => {
      const start = parseISO(event.startDate);
      const endExclusive = parseISO(event.endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(endExclusive.getTime())) {
        return;
      }

      const effectiveEnd = addDays(endExclusive, -1);
      if (effectiveEnd < start) {
        return;
      }

      eachDayOfInterval({ start, end: effectiveEnd }).forEach((day) => {
        if (isSameMonth(day, anchorDate)) {
          blockedDates.add(format(day, "yyyy-MM-dd"));
        }
      });
    });

  return blockedDates;
}

function getBookingSelectionKey(booking: BookingRecord) {
  if (booking.id) {
    return `id-${booking.id}`;
  }

  return [
    booking.checkIn,
    booking.checkout,
    booking.guestName.trim().toLowerCase(),
    booking.bookingNumber.trim().toLowerCase(),
    booking.propertyName.trim().toLowerCase(),
  ].join("__");
}

function intersectsMonth(booking: BookingRecord, anchorDate: Date) {
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const stayStart = parseISO(booking.checkIn);
  const stayEnd = parseISO(booking.checkout);

  return stayStart <= monthEnd && stayEnd > monthStart;
}

function buildTrimmedWeekBookingSegments(
  weekDays: Date[],
  items: CalendarTimelineItem[],
  anchorDate: Date,
) {
  const monthStart = startOfMonth(anchorDate);
  const monthEndExclusive = addDays(endOfMonth(anchorDate), 1);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekEndExclusive = addDays(weekEnd, 1);

  const visibleItems = items
    .filter((item) => {
      const stayStart = parseISO(item.startDate);
      const stayEnd = parseISO(item.endDate);
      return stayStart < weekEndExclusive && stayEnd > weekStart;
    })
    .sort((left, right) => {
      if (left.startDate !== right.startDate) {
        return left.startDate.localeCompare(right.startDate);
      }

      return left.endDate.localeCompare(right.endDate);
    });

  const trackEnds: number[] = [];

  const segments = visibleItems.flatMap((item) => {
    const stayStart = parseISO(item.startDate);
    const stayEnd = parseISO(item.endDate);
    const segmentStart = max([stayStart, weekStart, monthStart]);
    const segmentEnd = min([stayEnd, weekEndExclusive, monthEndExclusive]);

    if (segmentEnd <= segmentStart) {
      return [];
    }

    const startIndex = differenceInCalendarDays(segmentStart, weekStart);
    const span = Math.max(1, differenceInCalendarDays(segmentEnd, segmentStart));

    let track = trackEnds.findIndex((trackEnd) => trackEnd <= startIndex);

    if (track === -1) {
      track = trackEnds.length;
      trackEnds.push(0);
    }

    trackEnds[track] = startIndex + span;

    return [
      {
        item,
        startIndex,
        span,
        track,
        startsThisWeek: stayStart >= weekStart && stayStart < weekEndExclusive,
        endsThisWeek: stayEnd > weekStart && stayEnd <= weekEndExclusive,
      },
    ];
  });

  return {
    segments,
    maxTracks: Math.max(segments.reduce((highest, segment) => Math.max(highest, segment.track + 1), 0), 1),
  };
}

function MonthCalendar({
  anchorDate,
  bookings,
  calendarEvents,
  closures,
  compact = false,
  abbreviatedTitle = false,
  onSelectBooking,
}: {
  anchorDate: Date;
  bookings: BookingRecord[];
  calendarEvents: CalendarEventRecord[];
  closures: CalendarClosureRecord[];
  compact?: boolean;
  abbreviatedTitle?: boolean;
  onSelectBooking: (booking: BookingRecord) => void;
}) {
  const days = buildCalendarDays(anchorDate);
  const weeks = chunkWeeks(days);
  const monthLabel = format(anchorDate, abbreviatedTitle ? "MMMM" : "MMMM yyyy");
  const monthKey = format(anchorDate, "yyyy-MM");
  const timelineItems = buildTimelineItems(bookings, calendarEvents).filter((item) => {
    const stayStart = parseISO(item.startDate);
    const stayEnd = parseISO(item.endDate);
    const monthStart = startOfMonth(anchorDate);
    const monthEnd = endOfMonth(anchorDate);
    return stayStart <= monthEnd && stayEnd > monthStart;
  });
  const checkIns = timelineItems.filter((item) => item.startDate.startsWith(monthKey));
  const checkOuts = timelineItems.filter((item) => item.endDate.startsWith(monthKey));
  const blockedDateSet = buildBlockedDateSet(anchorDate, closures, calendarEvents);

  return (
    <SectionCard
      title={monthLabel}
      subtitle={`${formatNumber(checkIns.length)} check-ins, ${formatNumber(checkOuts.length)} check-outs, ${formatNumber(blockedDateSet.size)} closed days`}
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
            const { segments, maxTracks } = buildTrimmedWeekBookingSegments(weekDays, timelineItems, anchorDate);
            const rowHeight = compact ? Math.max(88, 38 + maxTracks * 26) : Math.max(124, 48 + maxTracks * 32);
            const barHeight = compact ? 22 : 28;
            const overlayTop = compact ? 34 : 40;

            return (
              <div key={format(weekDays[0], "yyyy-MM-dd")} className="relative" style={{ height: rowHeight }}>
                <div className="grid h-full grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const dayClosure = blockedDateSet.has(dayKey);
                    const isCurrentMonth = isSameMonth(day, anchorDate);

                    if (!isCurrentMonth) {
                      return <div key={dayKey} aria-hidden="true" className="h-full" />;
                    }

                    return (
                      <article
                        key={dayKey}
                        className={`rounded-[22px] px-3 py-2.5 ${
                          dayClosure
                            ? "border-amber-300/14 bg-[linear-gradient(180deg,rgba(244,198,105,0.08)_0%,rgba(15,24,38,0.92)_100%)]"
                            : "workspace-soft-card"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`font-semibold ${compact ? "text-xs" : "text-sm"} text-[var(--workspace-text)]`}
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

                <div className="absolute inset-x-0" style={{ top: overlayTop }}>
                  <div
                    className="grid grid-cols-7 gap-2"
                    style={{ gridAutoRows: `${barHeight}px` }}
                  >
                    {segments.map((segment) => (
                      <button
                        type="button"
                        key={`${segment.item.id}-${segment.startIndex}-${segment.track}`}
                        onClick={() => {
                          if (segment.item.booking) {
                            onSelectBooking(segment.item.booking);
                          }
                        }}
                        className={`flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl border px-3 text-left shadow-[0_10px_24px_rgba(2,6,23,0.22)] transition ${
                          segment.item.booking ? "hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/70" : "cursor-default"
                        } ${getBookingTone(segment.item.channel, segment.item.variant)}`}
                        style={{
                          gridColumn: `${segment.startIndex + 1} / span ${segment.span}`,
                          gridRow: segment.track + 1,
                          height: `${barHeight}px`,
                        }}
                        title={`${segment.item.label} · ${formatDateLabel(segment.item.startDate)} to ${formatDateLabel(segment.item.endDate)}`}
                      >
                        {segment.startsThisWeek ? (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/85" />
                        ) : null}
                        <span className={`truncate font-medium ${compact ? "text-[11px]" : "text-xs"}`}>
                          {segment.item.label}
                        </span>
                        {!compact && segment.span > 2 ? (
                          <span className="ml-auto shrink-0 text-[11px] text-white/70">
                            {segment.item.booking ? segment.item.channel : "synced"}
                          </span>
                        ) : null}
                        {segment.endsThisWeek ? (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/60" />
                        ) : null}
                      </button>
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
  calendarEvents,
  closures,
  monthAnchors,
  currencyCode,
}: {
  rangeLabel: string;
  bookings: BookingRecord[];
  calendarEvents: CalendarEventRecord[];
  closures: CalendarClosureRecord[];
  monthAnchors: Date[];
  currencyCode: CurrencyCode;
}) {
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const showOverviewGrid = monthAnchors.length > 1;
  const isYearGrid = monthAnchors.length === 12;
  const monthAnchorKey = useMemo(
    () => monthAnchors.map((anchorDate) => format(anchorDate, "yyyy-MM")).join(","),
    [monthAnchors],
  );

  useEffect(() => {
    panelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [monthAnchorKey]);

  return (
    <div ref={panelRef} className="space-y-6">
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
          const monthCalendarEvents = calendarEvents.filter((event) => {
            const eventStart = parseISO(event.startDate);
            const eventEnd = parseISO(event.endDate);
            return eventStart <= endOfMonth(anchorDate) && eventEnd > startOfMonth(anchorDate);
          });
          const monthClosures = closures.filter((closure) =>
            isWithinInterval(parseISO(closure.date), {
              start: startOfMonth(anchorDate),
              end: endOfMonth(anchorDate),
            }),
          );

          return (
            <div key={monthKey} className="space-y-4">
              <div className="flex items-center gap-4 px-1">
                <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(88,196,182,0.02),rgba(88,196,182,0.22),rgba(148,163,184,0.05))]" />
                <span className="rounded-full border border-[var(--accent-soft-strong)]/55 bg-[linear-gradient(180deg,rgba(88,196,182,0.1)_0%,rgba(255,255,255,0.03)_100%)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]/88 shadow-[0_8px_18px_rgba(88,196,182,0.08)]">
                  {format(anchorDate, "MMMM yyyy")}
                </span>
                <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(148,163,184,0.05),rgba(88,196,182,0.22),rgba(88,196,182,0.02))]" />
              </div>

              <MonthCalendar
                anchorDate={anchorDate}
                bookings={monthBookings}
                calendarEvents={monthCalendarEvents}
                closures={monthClosures}
                compact={showOverviewGrid}
                abbreviatedTitle={isYearGrid}
                onSelectBooking={setSelectedBooking}
              />
            </div>
          );
        })}
      </div>

      <Modal
        open={Boolean(selectedBooking)}
        title={selectedBooking ? selectedBooking.guestName : "Booking details"}
        onClose={() => setSelectedBooking(null)}
      >
        {selectedBooking ? (
          <div className="space-y-5">
            {(() => {
              const bookingStatus = getBookingStatusState(selectedBooking);

              return (
                <BookingStatusBadge status={bookingStatus} className="px-3 py-1.5 text-[11px]" />
              );
            })()}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <div className="workspace-soft-card rounded-[24px] p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Stay summary</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">
                  {selectedBooking.guestName}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                  {formatDateLabel(selectedBooking.checkIn)} to {formatDateLabel(selectedBooking.checkout)}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Property</p>
                    <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">
                      {selectedBooking.propertyName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Listing</p>
                    <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">
                      {selectedBooking.unitName || "Primary listing"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Guests</p>
                    <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">
                      {formatNumber(selectedBooking.guestCount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Nights</p>
                    <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">
                      {formatNumber(selectedBooking.nights)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="workspace-soft-card rounded-[24px] p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Booking details</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--workspace-muted)]">Channel</span>
                    <BookingChannelBadge channel={selectedBooking.channel} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--workspace-muted)]">Booking ref</span>
                    <span className="font-medium text-[var(--workspace-text)]">
                      {selectedBooking.bookingNumber || "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--workspace-muted)]">Status</span>
                    <BookingStatusBadge status={getBookingStatusState(selectedBooking)} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--workspace-muted)]">Rental period</span>
                    <span className="font-medium text-[var(--workspace-text)]">{selectedBooking.rentalPeriod}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="workspace-soft-card rounded-[22px] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Gross revenue</p>
                <p className="mt-2 text-xl font-semibold text-[var(--workspace-text)]">
                  {formatCurrency(selectedBooking.totalRevenue, false, currencyCode)}
                </p>
              </div>
              <div className="workspace-soft-card rounded-[22px] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Net payout</p>
                <p className="mt-2 text-xl font-semibold text-[var(--workspace-text)]">
                  {formatCurrency(selectedBooking.payout, false, currencyCode)}
                </p>
              </div>
              <div className="workspace-soft-card rounded-[22px] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Host fee</p>
                <p className="mt-2 text-xl font-semibold text-[var(--workspace-text)]">
                  {formatCurrency(selectedBooking.hostFee, false, currencyCode)}
                </p>
              </div>
              <div className="workspace-soft-card rounded-[22px] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Taxes</p>
                <p className="mt-2 text-xl font-semibold text-[var(--workspace-text)]">
                  {formatCurrency(selectedBooking.taxAmount, false, currencyCode)}
                </p>
              </div>
              <div className="workspace-soft-card rounded-[22px] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">Cleaning fee</p>
                <p className="mt-2 text-xl font-semibold text-[var(--workspace-text)]">
                  {formatCurrency(selectedBooking.cleaningFee, false, currencyCode)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href={`/dashboard/bookings?booking=${encodeURIComponent(getBookingSelectionKey(selectedBooking))}`}
                className="workspace-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                Open bookings page
              </Link>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="workspace-button-primary rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                Close details
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
