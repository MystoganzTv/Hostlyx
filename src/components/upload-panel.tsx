"use client";

import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";
import type { PropertyDefinition } from "@/lib/types";
import { WorkspaceSelect } from "@/components/workspace-select";

type UploadPhase = "idle" | "previewing" | "ready" | "importing";
type ToastTone = "success" | "error";

type PreviewWarning = {
  rowType: "booking" | "expense" | "file";
  rowIndex: number;
  code: string;
  message: string;
  severity: "warning" | "error";
};

type PreviewDuplicate = {
  rowType: "booking";
  rowIndex: number;
  code: string;
  message: string;
  severity: "warning";
  matchType: "reference" | "fallback";
  matchScope: "file" | "existing";
};

type PreviewRow = {
  guestName: string;
  channel: string;
  checkIn: string;
  checkOut: string;
  grossRevenue: number;
  payout: number;
};

type ReviewSection = "valid" | "warnings" | "duplicates" | "errors";

type MappingField =
  | "guestName"
  | "checkIn"
  | "checkOut"
  | "grossRevenue"
  | "payout"
  | "propertyName";

type ManualMappingPayload = {
  sheetName: string;
  headerRowIndex: number;
  guestName: number | null;
  checkIn: number | null;
  checkOut: number | null;
  grossRevenue: number | null;
  payout: number | null;
  propertyName: number | null;
};

type ManualMappingOption = {
  index: number;
  label: string;
};

type ManualMappingPreview = {
  message: string;
  sheetName: string;
  headerRowIndex: number;
  columns: ManualMappingOption[];
  suggested: Record<MappingField, number | null>;
  selected: Record<MappingField, number | null>;
  requiredReady: boolean;
};

type ReviewRow = {
  id: string;
  rowType: "booking" | "expense";
  rowIndex: number;
  section: ReviewSection;
  title: string;
  subtitle: string;
  reasons: string[];
};

type ImportPreviewPayload = {
  source: "airbnb" | "booking" | "generic" | "unknown";
  sourceLabel: string;
  fileName: string;
  requiresManualMapping: boolean;
  manualMapping: ManualMappingPreview | null;
  totalRowsRead: number;
  validRows: number;
  warningRows: number;
  duplicateRows: number;
  errorRows: number;
  skippedRows: number;
  expensesDetected: number;
  importableRows: number;
  previewRows: PreviewRow[];
  reviewRows: Record<ReviewSection, ReviewRow[]>;
  warnings: PreviewWarning[];
  duplicates: PreviewDuplicate[];
  canImport: boolean;
};

type ImportResponsePayload = {
  error?: string;
  message?: string;
  preview?: ImportPreviewPayload;
  committed?: {
    source: string;
    sourceLabel: string;
    bookingsImported: number;
    expensesImported: number;
    skippedRows: number;
  };
};

type UploadToast = {
  tone: ToastTone;
  message: string;
};

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

async function parseResponse(response: Response) {
  const raw = await response.text();

  try {
    return raw ? (JSON.parse(raw) as ImportResponsePayload) : {};
  } catch {
    return {};
  }
}

export function UploadPanel({
  properties,
  title = "Import Center",
  subtitle = "Upload an Airbnb export, a Booking.com export, or your generic Hostlyx workbook. Hostlyx will preview, validate, and review the data before saving anything.",
  refreshOnSuccess = true,
  onImportComplete,
}: {
  properties: PropertyDefinition[];
  title?: string;
  subtitle?: string;
  refreshOnSuccess?: boolean;
  onImportComplete?: (payload: { importedFilesCount: number; propertyName: string }) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPropertyName, setSelectedPropertyName] = useState(properties[0]?.name ?? "");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [preview, setPreview] = useState<ImportPreviewPayload | null>(null);
  const [manualMapping, setManualMapping] = useState<ManualMappingPayload | null>(null);
  const [reviewSection, setReviewSection] = useState<ReviewSection>("valid");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "import">("skip");
  const [toast, setToast] = useState<UploadToast | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const currentReviewRows = useMemo(() => {
    if (!preview) {
      return [];
    }

    return preview.reviewRows[reviewSection].slice(0, 6);
  }, [preview, reviewSection]);

  const actionableRows = useMemo(() => {
    if (!preview) {
      return 0;
    }

    return (
      preview.validRows +
      preview.warningRows +
      (duplicateStrategy === "import" ? preview.duplicateRows : 0)
    );
  }, [duplicateStrategy, preview]);

  const currentManualMapping = useMemo(() => {
    if (!preview?.manualMapping) {
      return null;
    }

    return manualMapping ?? {
      sheetName: preview.manualMapping.sheetName,
      headerRowIndex: preview.manualMapping.headerRowIndex,
      guestName: preview.manualMapping.selected.guestName,
      checkIn: preview.manualMapping.selected.checkIn,
      checkOut: preview.manualMapping.selected.checkOut,
      grossRevenue: preview.manualMapping.selected.grossRevenue,
      payout: preview.manualMapping.selected.payout,
      propertyName: preview.manualMapping.selected.propertyName,
    };
  }, [manualMapping, preview]);

  const currentManualReady = useMemo(() => {
    if (!currentManualMapping) {
      return false;
    }

    return (
      currentManualMapping.guestName != null &&
      currentManualMapping.checkIn != null &&
      currentManualMapping.checkOut != null &&
      currentManualMapping.grossRevenue != null
    );
  }, [currentManualMapping]);

  function resetSelection(nextFile: File | null) {
    setSelectedFile(nextFile);
    setPreview(null);
    setManualMapping(null);
    setReviewSection("valid");
    setDuplicateStrategy("skip");
    setToast(null);
    setPhase(nextFile ? "idle" : "idle");
    if (inputRef.current && !nextFile) {
      inputRef.current.value = "";
    }
  }

  async function handlePreview() {
    if (!selectedFile) {
      setToast({
        tone: "error",
        message: "Choose an Airbnb, Booking.com, or Hostlyx file before previewing the import.",
      });
      return;
    }

    setPhase("previewing");
    setToast(null);

    try {
      const formData = new FormData();
      formData.set("action", "preview");
      if (manualMapping) {
        formData.set("manualMapping", JSON.stringify(manualMapping));
      }
      formData.append("file", selectedFile);

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const payload = await parseResponse(response);

      if (!response.ok || !payload.preview) {
        throw new Error(payload.error ?? "Hostlyx could not preview this file.");
      }

      setPreview(payload.preview);
      setManualMapping(
        payload.preview.manualMapping
          ? {
              sheetName: payload.preview.manualMapping.sheetName,
              headerRowIndex: payload.preview.manualMapping.headerRowIndex,
              guestName: payload.preview.manualMapping.selected.guestName,
              checkIn: payload.preview.manualMapping.selected.checkIn,
              checkOut: payload.preview.manualMapping.selected.checkOut,
              grossRevenue: payload.preview.manualMapping.selected.grossRevenue,
              payout: payload.preview.manualMapping.selected.payout,
              propertyName: payload.preview.manualMapping.selected.propertyName,
            }
          : null,
      );
      setDuplicateStrategy("skip");
      setReviewSection(
        payload.preview.requiresManualMapping
          ? "warnings"
          : payload.preview.errorRows > 0
            ? "errors"
            : payload.preview.duplicateRows > 0
              ? "duplicates"
              : payload.preview.warningRows > 0
                ? "warnings"
                : "valid",
      );
      setPhase("ready");
    } catch (error) {
      setPhase("idle");
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Preview failed.",
      });
    }
  }

  async function handleImport() {
    if (!selectedFile || !preview?.canImport || actionableRows <= 0) {
      return;
    }

    setPhase("importing");
    setToast(null);

    try {
      const formData = new FormData();
      formData.set("action", "commit");
      formData.set("propertyName", selectedPropertyName);
      formData.set("duplicateStrategy", duplicateStrategy);
      if (manualMapping) {
        formData.set("manualMapping", JSON.stringify(manualMapping));
      }
      formData.append("file", selectedFile);

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Import failed.");
      }

      setToast({
        tone: "success",
        message: payload.message ?? "Import completed.",
      });
      setPhase("idle");
      setSelectedFile(null);
      setPreview(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      if (refreshOnSuccess) {
        router.refresh();
      }

      onImportComplete?.({
        importedFilesCount: 1,
        propertyName: selectedPropertyName,
      });
    } catch (error) {
      setPhase("ready");
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Import failed.",
      });
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    resetSelection(file);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function updateManualField(field: MappingField, value: string) {
    const previewManualMapping = preview?.manualMapping;

    if (!previewManualMapping) {
      return;
    }

    setManualMapping((current) => ({
      sheetName: current?.sheetName ?? previewManualMapping.sheetName,
      headerRowIndex: current?.headerRowIndex ?? previewManualMapping.headerRowIndex,
      guestName: current?.guestName ?? previewManualMapping.selected.guestName,
      checkIn: current?.checkIn ?? previewManualMapping.selected.checkIn,
      checkOut: current?.checkOut ?? previewManualMapping.selected.checkOut,
      grossRevenue: current?.grossRevenue ?? previewManualMapping.selected.grossRevenue,
      payout: current?.payout ?? previewManualMapping.selected.payout,
      propertyName: current?.propertyName ?? previewManualMapping.selected.propertyName,
      [field]: value === "" ? null : Number(value),
    }));
  }

  return (
    <div className="relative">
      {toast ? (
        <div className="pointer-events-none fixed right-4 top-4 z-[70] w-full max-w-md sm:right-6 sm:top-6">
          <div
            className={`pointer-events-auto rounded-[24px] border px-4 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.32)] ${
              toast.tone === "success"
                ? "border-emerald-400/24 bg-[rgba(7,28,26,0.96)] text-emerald-100"
                : "border-rose-400/24 bg-[rgba(40,12,18,0.96)] text-rose-100"
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {toast.tone === "success" ? "Import completed" : "Import needs attention"}
                </p>
                <p className="mt-1 text-sm leading-6 opacity-90">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded-full border border-white/10 p-2 transition hover:bg-white/5"
                aria-label="Dismiss import notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="workspace-card rounded-[30px] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--workspace-muted)]">
              {title}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">{subtitle}</p>
          </div>
          <div className="workspace-icon-chip rounded-3xl p-3">
            <UploadCloud className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={handleFileChange}
          />

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Target property
            </span>
            {properties.length > 1 ? (
              <WorkspaceSelect
                value={selectedPropertyName}
                onChange={setSelectedPropertyName}
                options={properties.map((property) => ({
                  value: property.name,
                  label: property.name,
                  description:
                    property.units.length > 0
                      ? `${property.units.length} unit${property.units.length === 1 ? "" : "s"}`
                      : "Single-home property",
                }))}
                placeholder="Select a property"
              />
            ) : (
              <div className="rounded-[18px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] px-4 py-3 text-sm text-[var(--workspace-text)]">
                {selectedPropertyName}
              </div>
            )}
          </div>

          <div
            className={`workspace-soft-card rounded-[24px] border border-dashed p-5 transition ${
              isDragging
                ? "border-[var(--workspace-accent)] bg-[rgba(125,211,197,0.08)]"
                : "border-[var(--workspace-border)]"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) {
                setIsDragging(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              resetSelection(event.dataTransfer.files?.[0] ?? null);
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--workspace-text)]">
                  {selectedFile ? selectedFile.name : "Upload one file to preview"}
                </p>
                <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                  {selectedFile
                    ? `${formatFileSize(selectedFile.size)} • Preview before saving`
                    : "Supported: Airbnb CSV/XLSX, Booking.com CSV/XLSX, and the generic Hostlyx Excel format."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedFile ? (
                  <button
                    type="button"
                    onClick={() => resetSelection(null)}
                    className="workspace-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition"
                  >
                    Remove
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="workspace-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition"
                >
                  {selectedFile ? "Replace file" : "Select file"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!selectedFile || phase === "previewing" || phase === "importing"}
              className="workspace-button-primary inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phase === "previewing" ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Reading file...
                </>
              ) : (
                "Preview import"
              )}
            </button>

            {preview ? (
              <button
                type="button"
                onClick={handleImport}
                disabled={actionableRows <= 0 || phase === "importing" || phase === "previewing"}
                className="workspace-button-secondary inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {phase === "importing" ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving import...
                  </>
                ) : actionableRows > 0 ? (
                  "Confirm import"
                ) : (
                  "Map columns manually"
                )}
              </button>
            ) : null}
          </div>

          {preview ? (
            <div className="workspace-soft-card rounded-[24px] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                    Import preview
                  </p>
                  <p className="mt-2 text-base font-medium text-[var(--workspace-text)]">
                    {preview.sourceLabel}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    preview.errorRows === 0 && preview.duplicateRows === 0 && preview.warningRows === 0
                      ? "border-emerald-400/24 bg-emerald-400/10 text-emerald-100"
                      : "border-amber-400/24 bg-amber-400/10 text-amber-100"
                  }`}
                >
                  {preview.errorRows === 0 && preview.duplicateRows === 0 && preview.warningRows === 0
                    ? "Ready to import"
                    : preview.requiresManualMapping
                      ? "Manual mapping"
                      : "Needs review"}
                </span>
              </div>

              {preview.manualMapping && currentManualMapping ? (
                <div className="mt-5 rounded-[20px] border border-[var(--workspace-accent)]/20 bg-[rgba(125,211,197,0.06)] p-4 sm:p-5">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-[var(--workspace-text)]">
                      Map your columns
                    </p>
                    <p className="text-sm leading-6 text-[var(--workspace-muted)]">
                      {preview.manualMapping?.message}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {([
                      ["guestName", "Guest Name", true],
                      ["checkIn", "Check-in", true],
                      ["checkOut", "Check-out", true],
                      ["grossRevenue", "Revenue (gross)", true],
                      ["payout", "Payout", false],
                      ["propertyName", "Property", false],
                    ] as Array<[MappingField, string, boolean]>).map(([field, label, required]) => (
                      <label key={field} className="space-y-2">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                          {label}
                          {required ? " *" : " (optional)"}
                        </span>
                        <select
                          value={currentManualMapping[field] ?? ""}
                          onChange={(event) => updateManualField(field, event.target.value)}
                          className="w-full rounded-[18px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] px-4 py-3 text-sm text-[var(--workspace-text)] outline-none transition focus:border-[var(--workspace-accent)]"
                        >
                          <option value="">Select a column</option>
                          {(preview.manualMapping?.columns ?? []).map((column) => (
                            <option key={`${field}-${column.index}`} value={column.index}>
                              {column.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--workspace-border)] bg-white/[0.02] px-4 py-3">
                    <p className="text-sm text-[var(--workspace-muted)]">
                      {currentManualReady
                        ? "Required fields are mapped. Preview again to continue."
                        : "Map Guest Name, Check-in, Check-out, and Revenue to continue."}
                    </p>
                    <button
                      type="button"
                      onClick={handlePreview}
                      disabled={!currentManualReady || phase === "previewing"}
                      className="workspace-button-primary inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {phase === "previewing" ? "Analyzing..." : "Preview with mapping"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ["Rows read", preview.totalRowsRead],
                  ["Valid rows", preview.validRows],
                  ["Warning rows", preview.warningRows],
                  ["Duplicate rows", preview.duplicateRows],
                  ["Error rows", preview.errorRows],
                  ["Skipped rows", preview.skippedRows],
                  ["Expenses", preview.expensesDetected],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] px-4 py-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {preview.duplicateRows > 0 ? (
                <div className="mt-5 rounded-[20px] border border-amber-400/20 bg-amber-300/[0.08] p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-100">
                        Duplicate review
                      </p>
                      <p className="mt-1 text-xs leading-6 text-amber-50/80">
                        Hostlyx found {preview.duplicateRows} booking
                        {preview.duplicateRows === 1 ? "" : "s"} that look already imported or repeated in this
                        file.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy("skip")}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          duplicateStrategy === "skip"
                            ? "workspace-button-primary"
                            : "workspace-button-secondary"
                        }`}
                      >
                        Skip duplicates
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy("import")}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          duplicateStrategy === "import"
                            ? "workspace-button-primary"
                            : "workspace-button-secondary"
                        }`}
                      >
                        Review and import duplicates
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-4">
                  <div className="flex items-center gap-3">
                    <div className="workspace-icon-chip rounded-2xl p-2">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--workspace-text)]">
                        First normalized rows
                      </p>
                      <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                        This is what Hostlyx is about to save.
                      </p>
                    </div>
                  </div>

                  {preview.previewRows.length > 0 ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="text-[11px] uppercase tracking-[0.16em] text-[var(--workspace-muted)]">
                          <tr>
                            <th className="pb-3 pr-4 font-medium">Guest</th>
                            <th className="pb-3 pr-4 font-medium">Channel</th>
                            <th className="pb-3 pr-4 font-medium">Check-in</th>
                            <th className="pb-3 pr-4 font-medium">Check-out</th>
                            <th className="pb-3 pr-4 font-medium">Gross Revenue</th>
                            <th className="pb-3 font-medium">Payout</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--workspace-border)] text-[var(--workspace-text)]">
                          {preview.previewRows.map((row, index) => (
                            <tr key={`${row.guestName}-${row.checkIn}-${index}`}>
                              <td className="py-3 pr-4">{row.guestName || "Guest"}</td>
                              <td className="py-3 pr-4">{row.channel}</td>
                              <td className="py-3 pr-4">{row.checkIn || "—"}</td>
                              <td className="py-3 pr-4">{row.checkOut || "—"}</td>
                              <td className="py-3 pr-4">{formatCurrency(row.grossRevenue)}</td>
                              <td className="py-3">{formatCurrency(row.payout)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[18px] border border-[var(--workspace-border)] bg-white/[0.02] px-4 py-4 text-sm text-[var(--workspace-muted)]">
                      No normalized booking rows are ready yet.
                    </div>
                  )}
                </div>

                <div className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-4">
                  <p className="text-sm font-medium text-[var(--workspace-text)]">Review</p>
                  <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                    Hostlyx separates clean rows from issues so you can decide quickly.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {([
                      ["valid", "Valid", preview.validRows],
                      ["warnings", "Warnings", preview.warningRows],
                      ["duplicates", "Duplicates", preview.duplicateRows],
                      ["errors", "Errors", preview.errorRows],
                    ] as Array<[ReviewSection, string, number]>).map(([section, label, count]) => (
                      <button
                        key={section}
                        type="button"
                        onClick={() => setReviewSection(section)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                          reviewSection === section
                            ? "border-[var(--workspace-accent)] bg-[rgba(125,211,197,0.12)] text-[var(--workspace-text)]"
                            : "border-[var(--workspace-border)] bg-white/[0.02] text-[var(--workspace-muted)]"
                        }`}
                      >
                        {label} · {count}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 space-y-3">
                    {currentReviewRows.length > 0 ? (
                      currentReviewRows.map((row) => (
                        <div
                          key={row.id}
                          className={`rounded-[16px] border px-3 py-3 text-sm ${
                            row.section === "errors"
                              ? "border-rose-400/18 bg-rose-300/[0.07] text-rose-50/90"
                              : row.section === "duplicates"
                                ? "border-amber-400/18 bg-amber-300/[0.07] text-amber-50/90"
                                : row.section === "warnings"
                                  ? "border-[var(--workspace-border)] bg-white/[0.03] text-[var(--workspace-text)]"
                                  : "border-emerald-400/18 bg-emerald-400/[0.08] text-emerald-50/90"
                          }`}
                        >
                          <p className="font-medium">{row.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] opacity-70">
                            {row.subtitle}
                          </p>
                          <div className="mt-2 space-y-1">
                            {row.reasons.slice(0, 2).map((reason) => (
                              <p key={reason} className="text-sm opacity-85">
                                {reason}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[16px] border border-[var(--workspace-border)] bg-white/[0.03] px-3 py-3 text-sm text-[var(--workspace-muted)]">
                        Nothing is flagged in this section.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="workspace-soft-card rounded-[24px] border border-dashed border-[var(--workspace-border)] px-5 py-6 text-sm text-[var(--workspace-muted)]">
              Upload a file to see detected source, validation results, and a normalized preview before anything is saved.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
