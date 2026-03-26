"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Settings2 } from "lucide-react";
import type { CurrencyCode } from "@/lib/types";

function inputClassName() {
  return "input-surface w-full rounded-2xl px-4 py-3 text-sm";
}

export function BusinessSettingsPanel({
  initialBusinessName,
  initialCurrencyCode,
}: {
  initialBusinessName: string;
  initialCurrencyCode: CurrencyCode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(initialCurrencyCode);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const formData = new FormData();
          formData.set("businessName", businessName);
          formData.set("currencyCode", currencyCode);

          const response = await fetch("/api/settings", {
            method: "POST",
            body: formData,
          });

          const payload = (await response.json()) as {
            error?: string;
            message?: string;
          };

          if (!response.ok) {
            setError(payload.error ?? "The business settings could not be saved.");
            return;
          }

          setMessage(payload.message ?? "Business settings saved.");
          router.refresh();
        } catch {
          setError("The business settings could not be saved.");
        }
      })();
    });
  }

  return (
    <div className="workspace-card rounded-[30px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--workspace-muted)]">
            Business Settings
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
            Each account keeps its own business name, currency, imports, and manual entries.
          </p>
        </div>
        <div className="workspace-icon-chip rounded-3xl p-3">
          <Settings2 className="h-6 w-6" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Business name
          </span>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={`${inputClassName()} pl-11`}
              type="text"
              name="businessName"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="PinarSabroso, Hostlyx Demo, Beach Loft..."
              required
            />
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Currency
          </span>
          <select
            className={inputClassName()}
            name="currencyCode"
            value={currencyCode}
            onChange={(event) => setCurrencyCode(event.target.value as CurrencyCode)}
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="workspace-button-primary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving settings..." : "Save settings"}
        </button>
      </form>

      <div className="mt-4 min-h-6">
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      </div>
    </div>
  );
}
