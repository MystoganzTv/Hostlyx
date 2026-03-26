"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Edit3, House, Layers3, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { CurrencyCode, PropertyDefinition } from "@/lib/types";

type PropertySummary = {
  id?: number;
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
  const [propertyMode, setPropertyMode] = useState<"single" | "multi">("single");
  const [unitCount, setUnitCount] = useState("2");
  const [unitDrafts, setUnitDrafts] = useState<Record<number, string>>({});
  const [editingProperty, setEditingProperty] = useState<PropertySummary | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<PropertySummary | null>(null);
  const [editingPropertyName, setEditingPropertyName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function createProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const normalizedName = propertyName.trim();
          const normalizedUnitCount = Math.max(2, Math.trunc(Number(unitCount) || 0));

          if (!normalizedName) {
            setError("Enter a property name first.");
            return;
          }

          if (propertyMode === "multi" && normalizedUnitCount < 2) {
            setError("Multi-unit properties need at least 2 units.");
            return;
          }

          const formData = new FormData();
          formData.set("name", normalizedName);

          const response = await fetch("/api/properties", {
            method: "POST",
            body: formData,
          });
          const payload = (await response.json()) as { error?: string; message?: string; propertyId?: number };

          if (!response.ok) {
            setError(payload.error ?? "The property could not be created.");
            return;
          }

          const propertyId = Number(payload.propertyId);

          if (propertyMode === "multi" && Number.isFinite(propertyId) && propertyId > 0) {
            for (let index = 1; index <= normalizedUnitCount; index += 1) {
              const unitFormData = new FormData();
              unitFormData.set("name", `Unit ${index}`);

              const unitResponse = await fetch(`/api/properties/${propertyId}/units`, {
                method: "POST",
                body: unitFormData,
              });

              if (!unitResponse.ok) {
                const unitPayload = (await unitResponse.json()) as { error?: string };
                setError(unitPayload.error ?? "The property was created, but some units could not be added.");
                router.refresh();
                return;
              }
            }
          }

          setPropertyName("");
          setPropertyMode("single");
          setUnitCount("2");
          setMessage(
            propertyMode === "multi"
              ? `${normalizedName} created with ${normalizedUnitCount} units.`
              : payload.message ?? "Property created.",
          );
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

  function openEditProperty(summary: PropertySummary) {
    setEditingProperty(summary);
    setEditingPropertyName(summary.name);
    setMessage(null);
    setError(null);
  }

  function submitPropertyUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingProperty?.id) {
      return;
    }

    setMessage(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const formData = new FormData();
          formData.set("name", editingPropertyName);

          const response = await fetch(`/api/properties/${editingProperty.id}`, {
            method: "PATCH",
            body: formData,
          });
          const payload = (await response.json()) as { error?: string; message?: string };

          if (!response.ok) {
            setError(payload.error ?? "The property could not be updated.");
            return;
          }

          setMessage(payload.message ?? "Property updated.");
          setEditingProperty(null);
          setEditingPropertyName("");
          router.refresh();
        } catch {
          setError("The property could not be updated.");
        }
      })();
    });
  }

  function confirmDeleteProperty() {
    if (!propertyToDelete?.id) {
      return;
    }

    setMessage(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/properties/${propertyToDelete.id}`, {
            method: "DELETE",
          });
          const payload = (await response.json()) as { error?: string; message?: string };

          if (!response.ok) {
            setError(payload.error ?? "The property could not be deleted.");
            return;
          }

          setMessage(payload.message ?? "Property deleted.");
          setPropertyToDelete(null);
          router.refresh();
        } catch {
          setError("The property could not be deleted.");
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
              <p className="text-base font-semibold text-[var(--workspace-text)]">
                {properties.length === 0 ? "Create your first property" : "Create property"}
              </p>
              <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                Start with the way this listing is rented, then decide whether units are needed.
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

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPropertyMode("single")}
                className={`rounded-[22px] border px-4 py-4 text-left transition ${
                  propertyMode === "single"
                    ? "border-[var(--workspace-accent)] bg-[var(--workspace-accent-soft)] text-[var(--workspace-text)]"
                    : "border-[var(--workspace-border)] bg-[var(--workspace-panel-soft)] text-[var(--workspace-muted)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <House className="h-4 w-4" />
                  <span className="text-sm font-semibold">Single house</span>
                </div>
                <p className="mt-2 text-xs leading-5">
                  Rent the entire home as one listing. No units are necessary.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPropertyMode("multi")}
                className={`rounded-[22px] border px-4 py-4 text-left transition ${
                  propertyMode === "multi"
                    ? "border-[var(--workspace-accent)] bg-[var(--workspace-accent-soft)] text-[var(--workspace-text)]"
                    : "border-[var(--workspace-border)] bg-[var(--workspace-panel-soft)] text-[var(--workspace-muted)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers3 className="h-4 w-4" />
                  <span className="text-sm font-semibold">Multi-unit</span>
                </div>
                <p className="mt-2 text-xs leading-5">
                  Apartments, rooms, suites, or several rentable units inside one property.
                </p>
              </button>
            </div>

            {propertyMode === "multi" ? (
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  How many units does it have?
                </span>
                <input
                  className={inputClassName()}
                  type="number"
                  min="2"
                  max="50"
                  value={unitCount}
                  onChange={(event) => setUnitCount(event.target.value)}
                />
              </label>
            ) : (
              <div className="workspace-soft-card rounded-[22px] px-4 py-3 text-sm text-[var(--workspace-muted)]">
                This property will be treated as one full-home listing. You can still add units later if needed.
              </div>
            )}

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
                Single-home rentals can skip units. Multi-unit properties can auto-create unit slots during setup.
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
          const propertySummary: PropertySummary = {
            ...summary,
            id: propertyId,
          };

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

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEditProperty(propertySummary)}
                  disabled={!propertyId || isPending}
                  className="workspace-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyToDelete(propertySummary)}
                  disabled={!propertyId || isPending}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
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

      <Modal
        open={Boolean(editingProperty)}
        title={editingProperty ? `Edit ${editingProperty.name}` : "Edit property"}
        onClose={() => {
          setEditingProperty(null);
          setEditingPropertyName("");
        }}
      >
        {editingProperty ? (
          <form onSubmit={submitPropertyUpdate} className="space-y-5">
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Property name
              </span>
              <input
                className={inputClassName()}
                value={editingPropertyName}
                onChange={(event) => setEditingPropertyName(event.target.value)}
                placeholder="Enter property name"
                required
              />
            </label>

            <div className="workspace-soft-card rounded-[22px] p-4 text-sm leading-6 text-[var(--workspace-muted)]">
              Renaming a property updates the property name across existing bookings and expenses in this workspace.
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="workspace-button-primary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving property..." : "Save property"}
            </button>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(propertyToDelete)}
        title={propertyToDelete ? `Delete ${propertyToDelete.name}?` : "Delete property"}
        onClose={() => setPropertyToDelete(null)}
      >
        {propertyToDelete ? (
          <div className="space-y-5">
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
              {propertyToDelete.bookings > 0 || propertyToDelete.expenses > 0
                ? "This property still has linked bookings or expenses. Move or delete those records first."
                : "This will delete the property and any saved units under it."}
            </div>

            <div className="workspace-soft-card grid gap-3 rounded-[22px] p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Bookings</p>
                <p className="mt-1 text-sm text-[var(--workspace-text)]">
                  {formatNumber(propertyToDelete.bookings)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Expenses</p>
                <p className="mt-1 text-sm text-[var(--workspace-text)]">
                  {formatCurrency(propertyToDelete.expenses, false, currencyCode)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Units</p>
                <p className="mt-1 text-sm text-[var(--workspace-text)]">
                  {formatNumber(propertyToDelete.units.length)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPropertyToDelete(null)}
                className="workspace-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProperty}
                disabled={isPending || propertyToDelete.bookings > 0 || propertyToDelete.expenses > 0}
                className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Deleting property..." : "Delete property"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
