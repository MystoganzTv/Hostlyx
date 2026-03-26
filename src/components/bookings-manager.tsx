"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Trash2 } from "lucide-react";
import { PropertyUnitFieldGroup } from "@/components/property-unit-field-group";
import { formatCurrency, formatDateLabel, formatNumber } from "@/lib/format";
import type { BookingRecord, CurrencyCode, PropertyDefinition } from "@/lib/types";
import { Modal } from "@/components/modal";

function inputClassName() {
  return "input-surface w-full rounded-2xl px-4 py-3 text-sm";
}

export function BookingsManager({
  bookings,
  currencyCode,
  properties,
}: {
  bookings: BookingRecord[];
  currencyCode: CurrencyCode;
  properties: PropertyDefinition[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<BookingRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            setError(payload.error ?? "The booking could not be updated.");
            return;
          }

          setMessage(payload.message ?? "Booking updated.");
          setEditingBooking(null);
          router.refresh();
        } catch {
          setError("The booking could not be updated.");
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
            setError(payload.error ?? "The booking could not be deleted.");
            return;
          }

          setMessage(payload.message ?? "Booking deleted.");
          setBookingToDelete(null);
          router.refresh();
        } catch {
          setError("The booking could not be deleted.");
        }
      })();
    });
  }

  return (
    <>
      <div className="space-y-4">
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="pb-3 pr-4 font-medium">Property</th>
                <th className="pb-3 pr-4 font-medium">Guest</th>
                <th className="pb-3 pr-4 font-medium">Stay</th>
                <th className="pb-3 pr-4 font-medium">Guests</th>
                <th className="pb-3 pr-4 font-medium">Channel</th>
                <th className="pb-3 pr-4 font-medium">Revenue</th>
                <th className="pb-3 pr-4 font-medium">Payout</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id ?? `${booking.checkIn}-${booking.guestName}`} className="border-t border-[var(--workspace-border)] text-[var(--workspace-muted)]">
                  <td className="py-4 pr-4">
                    <div>
                      <p className="font-medium text-[var(--workspace-text)]">{booking.propertyName}</p>
                      <p className="mt-1 text-xs text-slate-400">{booking.unitName || "No unit"}</p>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div>
                      <p className="font-medium text-[var(--workspace-text)]">{booking.guestName}</p>
                      <p className="mt-1 text-xs text-slate-400">{booking.rentalPeriod}</p>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    {formatDateLabel(booking.checkIn)} to {formatDateLabel(booking.checkout)}
                  </td>
                  <td className="py-4 pr-4">{formatNumber(booking.guestCount)}</td>
                  <td className="py-4 pr-4">{booking.channel}</td>
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
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingToDelete(booking)}
                        disabled={isPending}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(editingBooking)}
        title={editingBooking ? `Edit ${editingBooking.guestName}` : "Edit booking"}
        onClose={() => setEditingBooking(null)}
      >
        {editingBooking ? (
          <form onSubmit={submitUpdate} className="grid gap-4 sm:grid-cols-2">
            <PropertyUnitFieldGroup
              properties={properties}
              initialPropertyName={editingBooking.propertyName}
              initialUnitName={editingBooking.unitName}
            />
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Check-in</span>
              <input className={inputClassName()} type="date" name="checkIn" defaultValue={editingBooking.checkIn} required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Checkout</span>
              <input className={inputClassName()} type="date" name="checkout" defaultValue={editingBooking.checkout} required />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Guest name</span>
              <input className={inputClassName()} name="guestName" defaultValue={editingBooking.guestName} required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Guests</span>
              <input className={inputClassName()} type="number" min="1" name="guestCount" defaultValue={editingBooking.guestCount} required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Channel</span>
              <input className={inputClassName()} name="channel" defaultValue={editingBooking.channel} required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Price per night</span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="pricePerNight" defaultValue={editingBooking.pricePerNight} required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Extra fee</span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="extraFee" defaultValue={editingBooking.extraFee} />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Discount</span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="discount" defaultValue={editingBooking.discount} />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Cleaning fee</span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="cleaningFee" defaultValue={editingBooking.cleaningFee} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Host fee</span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="hostFee" defaultValue={editingBooking.hostFee} />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isPending}
                className="workspace-button-primary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Saving booking..." : "Save booking"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(bookingToDelete)}
        title={bookingToDelete ? `Delete ${bookingToDelete.guestName}?` : "Delete booking"}
        onClose={() => setBookingToDelete(null)}
      >
        {bookingToDelete ? (
          <div className="space-y-5">
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
              This will remove the booking for <span className="font-semibold text-rose-900">{bookingToDelete.guestName}</span> from your workspace.
              The action cannot be undone from the app.
            </div>

            <div className="workspace-soft-card grid gap-3 rounded-[22px] p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Property</p>
                <p className="mt-1 text-sm text-[var(--workspace-text)]">
                  {bookingToDelete.propertyName}
                  {bookingToDelete.unitName ? ` • ${bookingToDelete.unitName}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Stay</p>
                <p className="mt-1 text-sm text-[var(--workspace-text)]">
                  {formatDateLabel(bookingToDelete.checkIn)} to {formatDateLabel(bookingToDelete.checkout)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setBookingToDelete(null)}
                className="workspace-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteBooking}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Deleting booking..." : "Delete booking"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
