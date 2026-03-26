"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Layers3, Plus } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { CurrencyCode, PropertyDefinition } from "@/lib/types";

type PropertySummary = {
  name: string;
  units: string[];
  bookings: number;
  expenses: number;
  payout: number;
  profit: number;
};

function inputClassName() {
  return "input-surface w-full rounded-2xl px-4 py-3 text-sm";
}

export function PropertiesManager({
  properties,
  summaries,
  currencyCode,
}: {
  properties: PropertyDefinition[];
  summaries: PropertySummary[];
  currencyCode: CurrencyCode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [propertyName, setPropertyName] = useState("");
  const [unitDrafts, setUnitDrafts] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function createProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const formData = new FormData();
          formData.set("name", propertyName);

          const response = await fetch("/api/properties", {
            method: "POST",
            body: formData,
          });
          const payload = (await response.json()) as { error?: string; message?: string };

          if (!response.ok) {
            setError(payload.error ?? "The property could not be created.");
            return;
          }

          setPropertyName("");
          setMessage(payload.message ?? "Property created.");
          router.refresh();
        } catch {
          setError("The property could not be created.");
        }
      })();
    });
  }

  function createUnit(propertyId: number) {
    const unitName = unitDrafts[propertyId] ?? "";
    setMessage(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const formData = new FormData();
          formData.set("name", unitName);

          const response = await fetch(`/api/properties/${propertyId}/units`, {
            method: "POST",
            body: formData,
          });
          const payload = (await response.json()) as { error?: string; message?: string };

          if (!response.ok) {
            setError(payload.error ?? "The unit could not be created.");
            return;
          }

          setUnitDrafts((current) => ({ ...current, [propertyId]: "" }));
          setMessage(payload.message ?? "Unit created.");
          router.refresh();
        } catch {
          setError("The unit could not be created.");
        }
      })();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[0.62fr_1.38fr]">
        <form
          onSubmit={createProperty}
          className="workspace-card rounded-[26px] p-5"
        >
          <div className="flex items-center gap-3">
            <div className="workspace-icon-chip rounded-2xl p-3">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--workspace-text)]">Create property</p>
              <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                Add standalone homes or multi-unit buildings.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <input
              className={inputClassName()}
              value={propertyName}
              onChange={(event) => setPropertyName(event.target.value)}
              placeholder="Villa Sol, PinarSabroso, Downtown Lofts..."
            />
            <button
              type="submit"
              disabled={isPending}
              className="workspace-button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add property
            </button>
          </div>
        </form>

        <div className="workspace-card rounded-[26px] p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Saved properties</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">
                {formatNumber(properties.length)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Saved units</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">
                {formatNumber(properties.reduce((sum, property) => sum + property.units.length, 0))}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Structure</p>
              <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                Properties can have no units, one unit, or several units.
              </p>
            </div>
          </div>

          <div className="mt-4 min-h-6">
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {summaries.map((summary) => {
          const property = properties.find((entry) => entry.name === summary.name);
          const propertyId = property?.id ?? 0;

          return (
            <article
              key={summary.name}
              className="workspace-card rounded-[26px] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-[var(--workspace-text)]">{summary.name}</p>
                  <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                    {summary.units.length > 0
                      ? `${formatNumber(summary.units.length)} saved units`
                      : "No units yet"}
                  </p>
                </div>
                <div className="workspace-icon-chip rounded-2xl p-3">
                  <Layers3 className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="workspace-soft-card rounded-2xl px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Bookings</p>
                  <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">
                    {formatNumber(summary.bookings)}
                  </p>
                </div>
                <div className="workspace-soft-card rounded-2xl px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Expenses</p>
                  <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">
                    {formatCurrency(summary.expenses, false, currencyCode)}
                  </p>
                </div>
                <div className="workspace-soft-card rounded-2xl px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payout</p>
                  <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">
                    {formatCurrency(summary.payout, false, currencyCode)}
                  </p>
                </div>
                <div className="workspace-soft-card rounded-2xl px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Profit</p>
                  <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">
                    {formatCurrency(summary.profit, false, currencyCode)}
                  </p>
                </div>
              </div>

              {summary.units.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {summary.units.map((unit) => (
                    <span
                      key={`${summary.name}-${unit}`}
                      className="rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-panel-soft)] px-3 py-1 text-xs text-[var(--workspace-muted)]"
                    >
                      {unit}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[var(--workspace-muted)]">
                  This property works as a single unit for now. Add units only if you need them.
                </p>
              )}

              {propertyId ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    className={inputClassName()}
                    value={unitDrafts[propertyId] ?? ""}
                    onChange={(event) =>
                      setUnitDrafts((current) => ({
                        ...current,
                        [propertyId]: event.target.value,
                      }))
                    }
                    placeholder="Add a unit: Apt 2B, Garden Suite..."
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => createUnit(propertyId)}
                    className="workspace-button-secondary inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    Add unit
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
