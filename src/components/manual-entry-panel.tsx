"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PencilLine } from "lucide-react";

function inputClassName() {
  return "input-surface w-full rounded-2xl px-4 py-3 text-sm";
}

export function ManualEntryPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [expenseMessage, setExpenseMessage] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  function submitForm(
    endpoint: "/api/bookings" | "/api/expenses",
    formData: FormData,
    onSuccess: (message: string) => void,
    onError: (message: string) => void,
  ) {
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            body: formData,
          });

          const payload = (await response.json()) as {
            error?: string;
            message?: string;
          };

          if (!response.ok) {
            onError(payload.error ?? "The record could not be saved.");
            return;
          }

          onSuccess(payload.message ?? "Saved.");
          router.refresh();
        } catch {
          onError("The record could not be saved.");
        }
      })();
    });
  }

  async function handleBookingSubmit(formData: FormData) {
    setBookingMessage(null);
    setBookingError(null);

    submitForm(
      "/api/bookings",
      formData,
      (message) => setBookingMessage(message),
      (message) => setBookingError(message),
    );
  }

  async function handleExpenseSubmit(formData: FormData) {
    setExpenseMessage(null);
    setExpenseError(null);

    submitForm(
      "/api/expenses",
      formData,
      (message) => setExpenseMessage(message),
      (message) => setExpenseError(message),
    );
  }

  return (
    <div className="rounded-[30px] border border-white/8 bg-white/[0.02] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-text)]/80">
            Manual Entry
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Add bookings and expenses directly in the app.
          </p>
        </div>
        <div className="brand-icon rounded-3xl p-3">
          <PencilLine className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <form action={handleBookingSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Check-in
              </span>
              <input className={inputClassName()} type="date" name="checkIn" required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Checkout
              </span>
              <input className={inputClassName()} type="date" name="checkout" required />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Property
              </span>
              <input className={inputClassName()} type="text" name="propertyName" placeholder="Default Property" />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Unit
              </span>
              <input className={inputClassName()} type="text" name="unitName" placeholder="Unit, room, apartment..." />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Guest name
              </span>
              <input className={inputClassName()} type="text" name="guestName" placeholder="Guest name" required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Guests
              </span>
              <input className={inputClassName()} type="number" min="1" name="guestCount" defaultValue="1" required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Channel
              </span>
              <input className={inputClassName()} type="text" name="channel" placeholder="Airbnb, Booking.com, Direct..." required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Price per night
              </span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="pricePerNight" defaultValue="0" required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Extra fee
              </span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="extraFee" defaultValue="0" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Discount
              </span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="discount" defaultValue="0" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Cleaning fee
              </span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="cleaningFee" defaultValue="0" />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Host fee
              </span>
              <input className={inputClassName()} type="number" min="0" step="0.01" name="hostFee" defaultValue="0" />
            </label>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="brand-button inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving booking..." : "Add booking"}
          </button>
          <div className="min-h-6">
            {bookingMessage ? <p className="text-sm text-emerald-300">{bookingMessage}</p> : null}
            {bookingError ? <p className="text-sm text-rose-300">{bookingError}</p> : null}
          </div>
        </form>

        <form action={handleExpenseSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Date
              </span>
              <input className={inputClassName()} type="date" name="date" required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Amount
              </span>
              <input className={inputClassName()} type="number" min="0.01" step="0.01" name="amount" required />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Property
              </span>
              <input className={inputClassName()} type="text" name="propertyName" placeholder="Default Property" />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Unit
              </span>
              <input className={inputClassName()} type="text" name="unitName" placeholder="Unit, room, apartment..." />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Category
              </span>
              <input className={inputClassName()} type="text" name="category" placeholder="Cleaning, Repairs, Utilities..." required />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Description
              </span>
              <input className={inputClassName()} type="text" name="description" placeholder="What was paid for?" required />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Note
              </span>
              <textarea className={`${inputClassName()} min-h-[108px] resize-y`} name="note" placeholder="Optional note" />
            </label>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="brand-button-secondary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving expense..." : "Add expense"}
          </button>
          <div className="min-h-6">
            {expenseMessage ? <p className="text-sm text-emerald-300">{expenseMessage}</p> : null}
            {expenseError ? <p className="text-sm text-rose-300">{expenseError}</p> : null}
          </div>
        </form>
      </div>
    </div>
  );
}
