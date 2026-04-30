"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Edit3, Trash2 } from "lucide-react";
import { BookingChannelBadge, BookingStatusBadge } from "@/components/booking-badges";
import { useLocale } from "@/components/locale-provider";
import { PropertyUnitFieldGroup } from "@/components/property-unit-field-group";
import { WorkspaceDateField } from "@/components/workspace-date-field";
import { formatCurrency, formatDateLabel, formatNumber } from "@/lib/format";
import { getBookingStatusState } from "@/lib/booking-status";
import type { BookingRecord, CurrencyCode, PropertyDefinition } from "@/lib/types";
import { Modal } from "@/components/modal";

function inputClassName() {
  return "input-surface w-full rounded-2xl px-4 py-3 text-sm";
}

function getGuestBreakdownLabel(booking: BookingRecord) {
  const adults = Math.max(0, booking.adultsCount ?? 0);
  const children = Math.max(0, booking.childrenCount ?? 0);
  const infants = Math.max(0, booking.infantsCount ?? 0);

  if (adults + children + infants <= 0) {
    return "";
  }

  return `A ${adults} · C ${children} · I ${infants}`;
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

export function BookingsManager({
  bookings,
  currencyCode,
  properties,
  highlightedBookingKey,
}: {
  bookings: BookingRecord[];
  currencyCode: CurrencyCode;
  properties: PropertyDefinition[];
  highlightedBookingKey?: string | null;
}) {
  const { locale } = useLocale();
  const isSpanish = locale === "es";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<BookingRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeHighlightedBookingKey, setActiveHighlightedBookingKey] = useState<string | null>(
    highlightedBookingKey ?? null,
  );
  const bookingRowRefs = useRef(new Map<string, HTMLTableRowElement>());

  const highlightedBooking = useMemo(
    () =>
      activeHighlightedBookingKey
        ? bookings.find((booking) => getBookingSelectionKey(booking) === activeHighlightedBookingKey) ?? null
        : null,
    [activeHighlightedBookingKey, bookings],
  );

  useEffect(() => {
    if (!highlightedBookingKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveHighlightedBookingKey(highlightedBookingKey);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [highlightedBookingKey]);

  useEffect(() => {
    if (!activeHighlightedBookingKey) {
      return;
    }

    const row = bookingRowRefs.current.get(activeHighlightedBookingKey);

    if (!row) {
      return;
    }

    row.scrollIntoView({ behavior: "smooth", block: "center" });

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("booking");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });

    const timeoutId = window.setTimeout(() => {
      setActiveHighlightedBookingKey(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [activeHighlightedBookingKey, pathname, router, searchParams]);

  function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingBooking?.id) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setMessage(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/bookings/${editingBooking.id}`, {
            method: "PATCH",
            body: formData,
          });

          const payload = (await response.json()) as { error?: string; message?: string };

          if (!response.ok) {
            setError(payload.error ?? (isSpanish ? "No se pudo actualizar la reserva." : "The booking could not be updated."));
            return;
          }

          setMessage(payload.message ?? (isSpanish ? "Reserva actualizada." : "Booking updated."));
          setEditingBooking(null);
          router.refresh();
        } catch {
          setError(isSpanish ? "No se pudo actualizar la reserva." : "The booking could not be updated.");
        }
      })();
    });
  }

  function confirmDeleteBooking() {
    if (!bookingToDelete?.id) {
      return;
    }

    setMessage(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/bookings/${bookingToDelete.id}`, {
            method: "DELETE",
          });

          const payload = (await response.json()) as { error?: string; message?: string };

          if (!response.ok) {
            setError(payload.error ?? (isSpanish ? "No se pudo eliminar la reserva." : "The booking could not be deleted."));
            return;
          }

          setMessage(payload.message ?? (isSpanish ? "Reserva eliminada." : "Booking deleted."));
          setBookingToDelete(null);
          router.refresh();
        } catch {
          setError(isSpanish ? "No se pudo eliminar la reserva." : "The booking could not be deleted.");
        }
      })();
    });
  }

  return (
    <>
      <div className="space-y-4">
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
        {highlightedBooking ? (
          <div className="rounded-[20px] border border-[var(--accent-soft-strong)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-text)]">
            {isSpanish ? (
              <>
                Resaltando <span className="font-semibold text-white">{highlightedBooking.guestName}</span> desde la vista de calendario.
              </>
            ) : (
              <>
                Highlighting <span className="font-semibold text-white">{highlightedBooking.guestName}</span> from the calendar view.
              </>
            )}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">{isSpanish ? "Propiedad" : "Property"}</th>
                  <th className="pb-3 pr-4 font-medium">{isSpanish ? "Huésped" : "Guest"}</th>
                  <th className="pb-3 pr-4 font-medium">{isSpanish ? "Estancia" : "Stay"}</th>
                  <th className="pb-3 pr-4 font-medium">{isSpanish ? "Ref reserva" : "Booking Ref"}</th>
                  <th className="pb-3 pr-4 font-medium">{isSpanish ? "Huéspedes" : "Guests"}</th>
                  <th className="pb-3 pr-4 font-medium">{isSpanish ? "Canal" : "Channel"}</th>
                  <th className="pb-3 pr-4 font-medium">{isSpanish ? "Ingresos" : "Revenue"}</th>
                <th className="pb-3 pr-4 font-medium">{isSpanish ? "Payout" : "Payout"}</th>
                <th className="pb-3 font-medium">{isSpanish ? "Acciones" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const bookingKey = getBookingSelectionKey(booking);
                const isHighlighted = activeHighlightedBookingKey === bookingKey;
                const bookingStatus = getBookingStatusState(booking);

                return (
                <tr
                  key={booking.id ?? `${booking.checkIn}-${booking.guestName}`}
                  ref={(node) => {
                    if (node) {
                      bookingRowRefs.current.set(bookingKey, node);
                    } else {
                      bookingRowRefs.current.delete(bookingKey);
                    }
                  }}
                  className={`border-t text-[var(--workspace-muted)] transition ${
                    isHighlighted
                      ? "border-[var(--accent-soft-strong)] bg-[rgba(88,196,182,0.08)] shadow-[inset_0_0_0_1px_rgba(88,196,182,0.22)]"
                      : "border-[var(--workspace-border)]"
                  }`}
                >
                  <td className="py-4 pr-4">
                    <div>
                      <p className="font-medium text-[var(--workspace-text)]">{booking.propertyName}</p>
                      <p className="mt-1 text-xs text-slate-400">{booking.unitName || (isSpanish ? "Listing principal" : "Primary listing")}</p>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div>
                      <p className="font-medium text-[var(--workspace-text)]">{booking.guestName}</p>
                      {booking.guestContact ? (
                        <p className="mt-1 text-xs text-slate-400">{booking.guestContact}</p>
                      ) : null}
                      <div className="mt-2">
                        <BookingStatusBadge status={bookingStatus} />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    {formatDateLabel(booking.checkIn, locale)} {isSpanish ? "a" : "to"} {formatDateLabel(booking.checkout, locale)}
                  </td>
                  <td className="py-4 pr-4 text-xs text-slate-300">
                    <div>
                      <p>{booking.bookingNumber || (isSpanish ? "Sin definir" : "Not set")}</p>
                      {booking.bookedAt ? (
                        <p className="mt-1 text-[11px] text-slate-500">
                          {isSpanish ? "Reservada " : "Booked "}
                          {formatDateLabel(booking.bookedAt, locale)}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div>
                      <p>{formatNumber(booking.guestCount, locale)}</p>
                      {getGuestBreakdownLabel(booking) ? (
                        <p className="mt-1 text-[11px] text-slate-500">{getGuestBreakdownLabel(booking)}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <BookingChannelBadge channel={booking.channel} />
                  </td>
                  <td className="py-4 pr-4">{formatCurrency(booking.totalRevenue, false, currencyCode)}</td>
                  <td className="py-4 pr-4">{formatCurrency(booking.payout, false, currencyCode)}</td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingBooking(booking)}
                        className="workspace-button-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        {isSpanish ? "Editar" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingToDelete(booking)}
                        disabled={isPending}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {isSpanish ? "Eliminar" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(editingBooking)}
        title={
          editingBooking
            ? isSpanish
              ? `Editar ${editingBooking.guestName}`
              : `Edit ${editingBooking.guestName}`
            : isSpanish
              ? "Editar reserva"
              : "Edit booking"
        }
        onClose={() => setEditingBooking(null)}
      >
        {editingBooking ? (
          <form key={editingBooking.id ?? editingBooking.checkIn} onSubmit={submitUpdate} className="grid gap-4 sm:grid-cols-2">
            <PropertyUnitFieldGroup
              properties={properties}
              initialPropertyName={editingBooking.propertyName}
              initialUnitName={editingBooking.unitName}
            />
            <WorkspaceDateField
              name="checkIn"
              label={isSpanish ? "Check-in" : "Check-in"}
              defaultValue={editingBooking.checkIn}
              required
            />
            <WorkspaceDateField
              name="checkout"
              label={isSpanish ? "Check-out" : "Checkout"}
              defaultValue={editingBooking.checkout}
              required
            />
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {isSpanish ? "Nombre del huésped" : "Guest name"}
              </span>
              <input className={inputClassName()} name="guestName" defaultValue={editingBooking.guestName} required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {isSpanish ? "Número de reserva" : "Booking number"}
              </span>
              <input className={inputClassName()} name="bookingNumber" defaultValue={editingBooking.bookingNumber} />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {isSpanish ? "Estado de overbooking" : "Overbooking status"}
              </span>
              <input className={inputClassName()} name="overbookingStatus" defaultValue={editingBooking.overbookingStatus} />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {isSpanish ? "Huéspedes" : "Guests"}
              </span>
              <input className={inputClassName()} type="number" min="0" step="1" name="guestCount" defaultValue={editingBooking.guestCount} required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {isSpanish ? "Canal" : "Channel"}
              </span>
              <input className={inputClassName()} name="channel" defaultValue={editingBooking.channel} required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {isSpanish ? "Precio por noche" : "Price per night"}
              </span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="pricePerNight" defaultValue={editingBooking.pricePerNight} required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {isSpanish ? "Cargo extra" : "Extra fee"}
              </span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="extraFee" defaultValue={editingBooking.extraFee} />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {isSpanish ? "Descuento" : "Discount"}
              </span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="discount" defaultValue={editingBooking.discount} />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {isSpanish ? "Tarifa de limpieza" : "Cleaning fee"}
              </span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="cleaningFee" defaultValue={editingBooking.cleaningFee} />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {isSpanish ? "Impuestos" : "Taxes"}
              </span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="taxAmount" defaultValue={editingBooking.taxAmount} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {isSpanish ? "Fee del anfitrión" : "Host fee"}
              </span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="hostFee" defaultValue={editingBooking.hostFee} />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isPending}
                className="workspace-button-primary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending
                  ? isSpanish
                    ? "Guardando reserva..."
                    : "Saving booking..."
                  : isSpanish
                    ? "Guardar reserva"
                    : "Save booking"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(bookingToDelete)}
        title={
          bookingToDelete
            ? isSpanish
              ? `¿Eliminar ${bookingToDelete.guestName}?`
              : `Delete ${bookingToDelete.guestName}?`
            : isSpanish
              ? "Eliminar reserva"
              : "Delete booking"
        }
        onClose={() => setBookingToDelete(null)}
      >
        {bookingToDelete ? (
          <div className="space-y-5">
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
              {isSpanish ? (
                <>
                  Esto eliminará la reserva de <span className="font-semibold text-rose-900">{bookingToDelete.guestName}</span> de tu espacio de trabajo.
                  No podrás deshacer la acción desde la app.
                </>
              ) : (
                <>
                  This will remove the booking for <span className="font-semibold text-rose-900">{bookingToDelete.guestName}</span> from your workspace.
                  The action cannot be undone from the app.
                </>
              )}
            </div>

            <div className="workspace-soft-card grid gap-3 rounded-[22px] p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{isSpanish ? "Propiedad" : "Property"}</p>
                <p className="mt-1 text-sm text-[var(--workspace-text)]">
                  {bookingToDelete.propertyName}
                  {bookingToDelete.unitName ? ` • ${bookingToDelete.unitName}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{isSpanish ? "Estancia" : "Stay"}</p>
                <p className="mt-1 text-sm text-[var(--workspace-text)]">
                  {formatDateLabel(bookingToDelete.checkIn, locale)} {isSpanish ? "a" : "to"} {formatDateLabel(bookingToDelete.checkout, locale)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setBookingToDelete(null)}
                className="workspace-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                {isSpanish ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmDeleteBooking}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending
                  ? isSpanish
                    ? "Eliminando reserva..."
                    : "Deleting booking..."
                  : isSpanish
                    ? "Eliminar reserva"
                    : "Delete booking"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
