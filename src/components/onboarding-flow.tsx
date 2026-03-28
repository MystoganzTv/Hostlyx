"use client";

import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  FileSpreadsheet,
  Globe2,
  LayoutDashboard,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { UploadPanel } from "@/components/upload-panel";
import { formatCurrency } from "@/lib/format";
import { getMarketDefinition, marketDefinitions } from "@/lib/markets";
import { getDefaultTaxRateByCountry, normalizeTaxRate } from "@/lib/tax";
import type { CountryCode, CurrencyCode, PropertyDefinition, UserSettings } from "@/lib/types";

const onboardingPropertyName = "Main Property";

const steps = [
  {
    id: "welcome",
    label: "Welcome",
    title: "Get Hostlyx ready in a few quick steps.",
    icon: Sparkles,
  },
  {
    id: "workspace",
    label: "Workspace",
    title: "Set the workspace basics.",
    icon: Building2,
  },
  {
    id: "upload",
    label: "Upload",
    title: "Bring in your Excel file.",
    icon: FileSpreadsheet,
  },
  {
    id: "tax",
    label: "Tax rate",
    title: "Choose the estimate Hostlyx should use.",
    icon: ReceiptText,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    title: "You are ready to see the numbers.",
    icon: LayoutDashboard,
  },
] as const;

function inputClassName() {
  return "input-surface w-full rounded-2xl px-4 py-3 text-sm";
}

type OnboardingPreview = {
  hasData: boolean;
  netProfit: number;
  currencyCode: CurrencyCode;
};

export function OnboardingFlow({
  userName,
  initialSettings,
  initialProperties,
  defaultPropertyName = onboardingPropertyName,
}: {
  userName: string;
  initialSettings: UserSettings;
  initialProperties: PropertyDefinition[];
  defaultPropertyName?: string;
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isWorkspacePending, startWorkspaceTransition] = useTransition();
  const [isTaxPending, startTaxTransition] = useTransition();
  const [businessName, setBusinessName] = useState(initialSettings.businessName);
  const [countryCode, setCountryCode] = useState<CountryCode>(initialSettings.primaryCountryCode);
  const [properties, setProperties] = useState<PropertyDefinition[]>(initialProperties);
  const [taxCountryCode, setTaxCountryCode] = useState<CountryCode>(initialSettings.taxCountryCode);
  const [taxRate, setTaxRate] = useState(String(initialSettings.taxRate));
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [taxError, setTaxError] = useState<string | null>(null);
  const [hasUploadedData, setHasUploadedData] = useState(false);
  const [uploadedPropertyName, setUploadedPropertyName] = useState(
    initialProperties[0]?.name ?? defaultPropertyName,
  );
  const [previewVersion, setPreviewVersion] = useState(0);
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [preview, setPreview] = useState<OnboardingPreview | null>(null);

  const market = getMarketDefinition(countryCode);
  const selectedTaxMarket = getMarketDefinition(taxCountryCode);
  const normalizedTaxRate = normalizeTaxRate(taxRate);
  const previewCurrencyCode = preview?.currencyCode ?? initialSettings.currencyCode;
  const previewNetProfit = preview?.netProfit ?? 0;
  const previewSetAside =
    previewNetProfit > 0 ? previewNetProfit * (normalizedTaxRate / 100) : 0;
  const previewYouKeep = previewNetProfit - previewSetAside;
  const stepsCompleted = useMemo(() => {
    if (currentStep <= 1) {
      return currentStep;
    }

    if (currentStep === 2) {
      return 1;
    }

    if (currentStep === 3) {
      return hasUploadedData ? 3 : 2;
    }

    return 4;
  }, [currentStep, hasUploadedData]);

  useEffect(() => {
    if (!hasUploadedData || previewVersion === 0) {
      return;
    }

    let cancelled = false;

    async function loadPreview() {
      setPreviewState("loading");

      try {
        const response = await fetch("/api/onboarding-preview", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as OnboardingPreview & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "The preview could not be loaded.");
        }

        if (cancelled) {
          return;
        }

        setPreview(payload);
        setPreviewState("ready");
      } catch {
        if (cancelled) {
          return;
        }

        setPreview(null);
        setPreviewState("error");
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [hasUploadedData, previewVersion]);

  function renderValueMoment() {
    if (!hasUploadedData) {
      return null;
    }

    if (previewState === "loading" || previewState === "idle") {
      return (
        <div className="workspace-card rounded-[30px] p-6 sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
            First look
          </p>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--workspace-text)]">
            Here’s what your business looks like right now.
          </h3>
          <p className="mt-4 text-sm leading-7 text-[var(--workspace-muted)]">
            Reading the imported numbers and preparing your first summary.
          </p>
        </div>
      );
    }

    if (previewState === "error" || !preview?.hasData) {
      return (
        <div className="workspace-card rounded-[30px] p-6 sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
            First look
          </p>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--workspace-text)]">
            Here’s what your business looks like right now.
          </h3>
          <p className="mt-4 text-sm leading-7 text-[var(--workspace-muted)]">
            Hostlyx imported your file, but there is not enough clean financial data yet to show this summary.
          </p>
        </div>
      );
    }

    const youKeepPositive = previewYouKeep >= 0;

    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
            First look
          </p>
          <h3 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--workspace-text)] sm:text-4xl">
            Here’s what your business looks like right now.
          </h3>
          <p className="max-w-2xl text-sm leading-7 text-[var(--workspace-muted)]">
            The estimate below updates as you adjust the tax rate, so the first number you see is what you keep.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.7fr)]">
          <article
            className={`workspace-card rounded-[32px] p-6 sm:p-7 ring-1 ${
              youKeepPositive
                ? "bg-[linear-gradient(180deg,rgba(29,78,60,0.2)_0%,rgba(11,22,38,0.98)_100%)] ring-emerald-300/14"
                : "bg-[linear-gradient(180deg,rgba(120,28,50,0.16)_0%,rgba(11,22,38,0.98)_100%)] ring-rose-300/12"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
              You Keep
            </p>
            <p
              className={`mt-5 text-5xl font-semibold tracking-[-0.06em] sm:text-6xl ${
                youKeepPositive ? "text-white" : "text-rose-200"
              }`}
            >
              {formatCurrency(previewYouKeep, false, previewCurrencyCode)}
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              This is roughly what you keep after setting aside estimated taxes.
            </p>
          </article>

          <div className="grid gap-4">
            <article className="workspace-soft-card rounded-[26px] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                Set Aside
              </p>
              <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--workspace-text)]">
                {formatCurrency(previewSetAside, false, previewCurrencyCode)}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                Based on the tax rate in this setup.
              </p>
            </article>

            <article className="workspace-soft-card rounded-[26px] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                Net Profit
              </p>
              <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--workspace-text)]">
                {formatCurrency(previewNetProfit, false, previewCurrencyCode)}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                Before estimated taxes are set aside.
              </p>
            </article>
          </div>
        </div>
      </div>
    );
  }

  function handleWorkspaceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorkspaceError(null);

    const normalizedBusinessName = businessName.trim();

    if (!normalizedBusinessName) {
      setWorkspaceError("Add a workspace name before continuing.");
      return;
    }

    startWorkspaceTransition(() => {
      void (async () => {
        try {
          const settingsFormData = new FormData();
          settingsFormData.set("businessName", normalizedBusinessName);
          settingsFormData.set("primaryCountryCode", countryCode);

          const settingsResponse = await fetch("/api/settings", {
            method: "POST",
            body: settingsFormData,
          });
          const settingsPayload = (await settingsResponse.json()) as { error?: string };

          if (!settingsResponse.ok) {
            setWorkspaceError(settingsPayload.error ?? "The workspace could not be saved.");
            return;
          }

          if (properties.length === 0) {
            const propertyFormData = new FormData();
            propertyFormData.set("name", defaultPropertyName);
            propertyFormData.set("countryCode", countryCode);

            const propertyResponse = await fetch("/api/properties", {
              method: "POST",
              body: propertyFormData,
            });
            const propertyPayload = (await propertyResponse.json()) as {
              error?: string;
              propertyId?: number;
            };

            if (!propertyResponse.ok) {
              setWorkspaceError(propertyPayload.error ?? "The starter property could not be created.");
              return;
            }

            setProperties([
              {
                id: propertyPayload.propertyId,
                name: defaultPropertyName,
                countryCode,
                units: [],
              },
            ]);
            setUploadedPropertyName(defaultPropertyName);
          }

          if (taxCountryCode !== countryCode && initialProperties.length === 0) {
            setTaxCountryCode(countryCode);
            setTaxRate(String(getDefaultTaxRateByCountry(countryCode)));
          }

          setCurrentStep(2);
        } catch {
          setWorkspaceError("The workspace could not be saved.");
        }
      })();
    });
  }

  function handleTaxSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTaxError(null);

    startTaxTransition(() => {
      void (async () => {
        try {
          const formData = new FormData();
          formData.set("taxCountryCode", taxCountryCode);
          formData.set("taxRate", String(normalizedTaxRate));

          const response = await fetch("/api/tax-settings", {
            method: "POST",
            body: formData,
          });
          const payload = (await response.json()) as { error?: string };

          if (!response.ok) {
            setTaxError(payload.error ?? "The tax rate could not be saved.");
            return;
          }

          setCurrentStep(4);
        } catch {
          setTaxError("The tax rate could not be saved.");
        }
      })();
    });
  }

  function renderStep() {
    if (currentStep === 0) {
      return (
        <section className="space-y-8">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
              Welcome
            </p>
            <h1 className="text-4xl font-semibold tracking-[-0.06em] text-[var(--workspace-text)] sm:text-5xl">
              See your financial dashboard fast.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[var(--workspace-muted)]">
              We will set the workspace basics, bring in your Excel file, set a simple tax estimate,
              and get you straight into the dashboard.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="workspace-soft-card rounded-[26px] p-5">
              <p className="text-sm font-semibold text-[var(--workspace-text)]">1. Set your market</p>
              <p className="mt-2 text-sm leading-7 text-[var(--workspace-muted)]">
                Name the workspace and choose the country and currency context Hostlyx should use.
              </p>
            </div>
            <div className="workspace-soft-card rounded-[26px] p-5">
              <p className="text-sm font-semibold text-[var(--workspace-text)]">2. Upload your data</p>
              <p className="mt-2 text-sm leading-7 text-[var(--workspace-muted)]">
                Import `Bookings` and `Expenses` from Excel so the dashboard has real numbers immediately.
              </p>
            </div>
            <div className="workspace-soft-card rounded-[26px] p-5">
              <p className="text-sm font-semibold text-[var(--workspace-text)]">3. Check your estimate</p>
              <p className="mt-2 text-sm leading-7 text-[var(--workspace-muted)]">
                Pick a simple tax rate, then land on the dashboard with everything ready to read.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="workspace-button-primary inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition"
            >
              Start onboarding
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/"
              className="workspace-button-secondary inline-flex items-center rounded-2xl px-5 py-3.5 text-sm font-semibold transition"
            >
              Back home
            </Link>
          </div>
        </section>
      );
    }

    if (currentStep === 1) {
      return (
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
              Workspace setup
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--workspace-text)]">
              Give Hostlyx the right home base.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[var(--workspace-muted)]">
              Keep this simple. We will use the selected market as your default reporting context and create
              one starter property automatically so you can import right away.
            </p>
          </div>

          <form onSubmit={handleWorkspaceSubmit} className="space-y-5">
            <div className="workspace-soft-card rounded-[26px] p-5">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                  Workspace name
                </span>
                <input
                  className={inputClassName()}
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Hostlyx Capital, My Rental Portfolio..."
                  required
                />
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                    Market
                  </p>
                  <p className="mt-2 text-sm text-[var(--workspace-muted)]">
                    Country and currency stay linked so reporting stays consistent.
                  </p>
                </div>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-[var(--workspace-text)]">
                  {market.currencyCode}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {marketDefinitions.map((entry) => {
                  const isSelected = entry.countryCode === countryCode;

                  return (
                    <button
                      key={entry.countryCode}
                      type="button"
                      onClick={() => setCountryCode(entry.countryCode)}
                      className={`rounded-[26px] border p-5 text-left transition ${
                        isSelected
                          ? "border-[var(--workspace-accent)] bg-[var(--workspace-accent-soft)] shadow-[0_0_0_1px_rgba(88,196,182,0.16)]"
                          : "border-[var(--workspace-border)] bg-[var(--workspace-panel-soft)] hover:border-[var(--workspace-accent)]/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="workspace-icon-chip rounded-[18px] p-3">
                          <Globe2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--workspace-text)]">
                            {entry.countryName}
                          </p>
                          <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                            {entry.currencyCode} • {entry.currencyLabel}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="workspace-soft-card rounded-[26px] p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                    Workspace
                  </p>
                  <p className="mt-3 text-base font-semibold text-[var(--workspace-text)]">
                    {businessName.trim() || "Your workspace"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                    Default market
                  </p>
                  <p className="mt-3 text-base font-semibold text-[var(--workspace-text)]">
                    {market.countryName}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                    Starter property
                  </p>
                  <p className="mt-3 text-base font-semibold text-[var(--workspace-text)]">
                    {properties[0]?.name ?? defaultPropertyName}
                  </p>
                </div>
              </div>
            </div>

            {workspaceError ? (
              <p className="text-sm text-rose-400">{workspaceError}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="workspace-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={isWorkspacePending}
                className="workspace-button-primary inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isWorkspacePending ? "Saving workspace..." : "Continue to upload"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      );
    }

    if (currentStep === 2) {
      return (
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
              Upload Excel
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--workspace-text)]">
              Import bookings and expenses.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[var(--workspace-muted)]">
              Upload your CSV or Excel export and we will move the data into Hostlyx. As soon as the import lands,
              you can finish the tax estimate and head straight to the dashboard.
            </p>
          </div>

          <UploadPanel
            properties={properties}
            title="Upload Airbnb, Booking.com, or Excel"
            subtitle="Bring in your bookings, payouts, and expenses so the dashboard opens with real financial data."
            refreshOnSuccess={false}
            onImportComplete={({ propertyName }) => {
              setUploadedPropertyName(propertyName);
              setHasUploadedData(true);
              setPreviewVersion((current) => current + 1);
              setCurrentStep(3);
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="workspace-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </section>
      );
    }

    if (currentStep === 3) {
      const estimatedTaxPreview =
        normalizedTaxRate > 0 ? `Hostlyx will set aside ${normalizedTaxRate}% of net profit.` : "No tax will be set aside.";

      return (
        <section className="space-y-6">
          {renderValueMoment()}

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
              Tax rate setup
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--workspace-text)]">
              Keep the estimate lightweight.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[var(--workspace-muted)]">
              This only helps the dashboard show what to set aside and what you keep. You can change it later in Settings.
            </p>
          </div>

          <form onSubmit={handleTaxSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <div className="workspace-soft-card rounded-[26px] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                  Tax market
                </p>
                <div className="mt-4 grid gap-3">
                  {marketDefinitions.map((entry) => {
                    const isSelected = entry.countryCode === taxCountryCode;

                    return (
                      <button
                        key={entry.countryCode}
                        type="button"
                        onClick={() => {
                          setTaxCountryCode(entry.countryCode);
                          setTaxRate(String(getDefaultTaxRateByCountry(entry.countryCode)));
                          setTaxError(null);
                        }}
                        className={`rounded-[20px] border px-4 py-4 text-left transition ${
                          isSelected
                            ? "border-[var(--workspace-accent)] bg-[var(--workspace-accent-soft)]"
                            : "border-[var(--workspace-border)] bg-[var(--workspace-panel-soft)]"
                        }`}
                      >
                        <p className="text-sm font-semibold text-[var(--workspace-text)]">{entry.countryName}</p>
                        <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                          Default {getDefaultTaxRateByCountry(entry.countryCode)}%
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="workspace-soft-card rounded-[26px] p-5">
                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                      Tax rate
                    </span>
                    <div className="relative">
                      <input
                        className={`${inputClassName()} pr-12`}
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={taxRate}
                        onChange={(event) => {
                          setTaxRate(event.target.value);
                          setTaxError(null);
                        }}
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--workspace-muted)]">
                        %
                      </span>
                    </div>
                  </label>
                </div>

                <div className="workspace-card rounded-[28px] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                    Preview
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--workspace-text)]">
                    {selectedTaxMarket.countryName} • {normalizedTaxRate}%
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--workspace-muted)]">
                    {estimatedTaxPreview}
                  </p>
                </div>
              </div>
            </div>

            {taxError ? <p className="text-sm text-rose-400">{taxError}</p> : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="workspace-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={isTaxPending}
                className="workspace-button-primary inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTaxPending ? "Saving tax rate..." : "Continue to dashboard"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      );
    }

    return (
      <section className="space-y-8">
        <div className="inline-flex rounded-full border border-emerald-400/18 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100">
          Hostlyx is ready
        </div>

        {renderValueMoment()}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="workspace-button-primary inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition"
          >
            Go to dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className="workspace-button-secondary inline-flex items-center rounded-2xl px-5 py-3.5 text-sm font-semibold transition"
          >
            Review tax rate
          </button>
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--workspace-bg)] px-4 py-6 sm:px-6 xl:px-8">
      <div className="mx-auto grid w-full max-w-[1480px] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="workspace-card rounded-[34px] p-6 sm:p-7 xl:sticky xl:top-6 xl:h-fit">
          <div className="flex items-center gap-3">
            <BrandLogo href="/" compact />
          </div>

          <div className="mt-8 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
              Onboarding
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--workspace-text)]">
              Hi {userName.split(" ")[0] || "there"}.
            </h2>
            <p className="text-sm leading-7 text-[var(--workspace-muted)]">
              Keep this fast. The goal is one clean setup pass, then straight into your financial dashboard.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isDone = index < stepsCompleted;

              return (
                <div
                  key={step.id}
                  className={`rounded-[24px] border p-4 transition ${
                    isActive
                      ? "border-[var(--workspace-accent)] bg-[var(--workspace-accent-soft)]"
                      : isDone
                        ? "border-emerald-400/18 bg-emerald-400/10"
                        : "border-[var(--workspace-border)] bg-[var(--workspace-panel-soft)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-[18px] p-3 ${isDone ? "bg-emerald-400/14 text-emerald-200" : "workspace-icon-chip"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                        Step {index + 1}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--workspace-text)]">
                        {step.label}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-[var(--workspace-muted)]">
                        {step.title}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="workspace-card rounded-[36px] p-6 sm:p-7 xl:p-9">
          <div className="mb-8 flex flex-col gap-4 border-b border-white/6 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
                Step {currentStep + 1} of {steps.length}
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--workspace-text)] sm:text-3xl">
                {steps[currentStep]?.title}
              </h1>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:w-[280px]">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`h-2 rounded-full ${
                    index <= currentStep
                      ? "bg-[var(--workspace-accent)]"
                      : "bg-white/8"
                  }`}
                />
              ))}
            </div>
          </div>

          {renderStep()}
        </section>
      </div>
    </main>
  );
}
