"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { PropertyUnitFieldGroup } from "@/components/property-unit-field-group";
import type { PropertyDefinition } from "@/lib/types";

function inputClassName() {
  return "input-surface w-full rounded-2xl px-4 py-3 text-sm";
}

export function CalendarIcalLauncher({
  properties,
}: {
  properties: PropertyDefinition[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/calendar/ical", {
            method: "POST",
            body: formData,
          });

          const payload = (await response.json()) as {
            error?: string;
            message?: string;
          };

          if (!response.ok) {
            setError(payload.error ?? "The iCal feed could not be imported.");
            return;
          }

          setMessage(payload.message ?? "iCal imported.");
          setIsOpen(false);
          router.refresh();
        } catch {
          setError("The iCal feed could not be imported.");
        }
      })();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="workspace-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition"
      >
        <Link2 className="h-4 w-4" />
        Connect iCal
      </button>

      <Modal
        open={isOpen}
        title="Connect iCal"
        onClose={() => setIsOpen(false)}
      >
        <form action={handleSubmit} className="space-y-5">
          <div className="workspace-soft-card rounded-[24px] p-5">
            <p className="text-sm font-semibold text-[var(--workspace-text)]">Save a real calendar connection</p>
            <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
              Paste the public `.ics` URL from Airbnb, Booking.com, Vrbo, or another channel. Hostlyx will save that feed on the selected listing and sync it into calendar events.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PropertyUnitFieldGroup properties={properties} />

            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Channel source
              </span>
              <select className={inputClassName()} name="source" defaultValue="airbnb">
                <option value="airbnb">Airbnb</option>
                <option value="booking">Booking.com</option>
                <option value="vrbo">Vrbo</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Public iCal URL
              </span>
              <input
                className={inputClassName()}
                type="url"
                name="icalUrl"
                placeholder="https://..."
                required
              />
            </label>
          </div>

          <div className="rounded-[22px] border border-[var(--workspace-border)] bg-white/[0.02] px-4 py-4 text-sm leading-6 text-[var(--workspace-muted)]">
            iCal is great for calendar visibility. It usually brings check-ins, check-outs, reservations, and blocked days, but not full financial statement data like payout, fees, or taxes.
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="workspace-button-primary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving and syncing..." : "Save and sync"}
          </button>

          <div className="min-h-6">
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          </div>
        </form>
      </Modal>
    </>
  );
}
