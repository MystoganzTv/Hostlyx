"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  AlertTriangle,
  BedDouble,
  Building2,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
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

type ManualMappingFieldIssue = {
  severity: "warning" | "error";
  message: string;
};

type ManualMappingPreview = {
  message: string;
  sheetName: string;
  headerRowIndex: number;
  columns: ManualMappingOption[];
  suggested: Record<MappingField, number | null>;
  selected: Record<MappingField, number | null>;
  fieldIssues: Partial<Record<MappingField, ManualMappingFieldIssue>>;
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
  committed?: ImportCommittedPayload;
};

type ImportCommittedPayload = {
  source: string;
  sourceLabel: string;
  bookingsImported: number;
  expensesImported: number;
  skippedRows: number;
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

function getSourcePresentation(source: ImportPreviewPayload["source"]) {
  switch (source) {
    case "airbnb":
      return {
        icon: BedDouble,
        badge: "Airbnb",
        description: "We detected your file format and mapped your data automatically.",
      };
    case "booking":
      return {
        icon: Building2,
        badge: "Booking.com",
        description: "We detected your file format and mapped your data automatically.",
      };
    case "generic":
      return {
        icon: FileSpreadsheet,
        badge: "Excel",
        description: "We detected your workbook structure and prepared it for review.",
      };
    default:
      return {
        icon: Sparkles,
        badge: "Mapped file",
        description: "Your file needed a quick column mapping, and Hostlyx prepared it for review.",
      };
  }
}

export function UploadPanel({
  properties,
  title = "Bring your data",
  subtitle = "Upload your Airbnb, Booking.com, or Excel files to see your real numbers.",
  refreshOnSuccess = true,
  onImportComplete,
  onCancel,
}: {
  properties: PropertyDefinition[];
  title?: string;
  subtitle?: string;
  refreshOnSuccess?: boolean;
  onImportComplete?: (payload: { importedFilesCount: number; propertyName: string }) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sourceDetectedRef = useRef<HTMLDivElement | null>(null);
  const mappingRef = useRef<HTMLDivElement | null>(null);
  const reviewRef = useRef<HTMLDetailsElement | null>(null);
  const readyToContinueRef = useRef<HTMLDivElement | null>(null);
  const importButtonRef = useRef<HTMLButtonElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPropertyName, setSelectedPropertyName] = useState(properties[0]?.name ?? "");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [preview, setPreview] = useState<ImportPreviewPayload | null>(null);
  const [manualMapping, setManualMapping] = useState<ManualMappingPayload | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "import">("skip");
  const [toast, setToast] = useState<UploadToast | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [committed, setCommitted] = useState<ImportCommittedPayload | null>(null);
  const [shouldFocusImportAction, setShouldFocusImportAction] = useState(false);

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

  const importButtonLabel = useMemo(() => {
    if (phase === "importing") {
      return "Importing data...";
    }

    if (!preview) {
      return "Import data";
    }

    if (actionableRows > 0) {
      return `Import ${actionableRows} clean row${actionableRows === 1 ? "" : "s"}`;
    }

    return "Map columns manually";
  }, [actionableRows, phase, preview]);

  const reviewItems = useMemo(() => {
    if (!preview) {
      return [];
    }

    return [
      ...preview.reviewRows.errors,
      ...preview.reviewRows.duplicates,
      ...preview.reviewRows.warnings,
    ].slice(0, 8);
  }, [preview]);

  const needsFocusedMapping = useMemo(() => {
    if (!preview?.manualMapping) {
      return false;
    }

    return preview.importableRows === 0;
  }, [preview]);

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
      currentManualMapping.grossRevenue != null &&
      (!preview?.manualMapping?.fieldIssues.guestName ||
        preview.manualMapping.fieldIssues.guestName.severity !== "error") &&
      (!preview?.manualMapping?.fieldIssues.checkIn ||
        preview.manualMapping.fieldIssues.checkIn.severity !== "error") &&
      (!preview?.manualMapping?.fieldIssues.checkOut ||
        preview.manualMapping.fieldIssues.checkOut.severity !== "error") &&
      (!preview?.manualMapping?.fieldIssues.grossRevenue ||
        preview.manualMapping.fieldIssues.grossRevenue.severity !== "error")
    );
  }, [currentManualMapping, preview]);

  const currentManualIssues = useMemo(() => {
    if (!preview?.manualMapping) {
      return {};
    }

    return preview.manualMapping.fieldIssues;
  }, [preview]);

  const shouldShowManualMapping = useMemo(() => {
    if (!preview?.manualMapping || !currentManualMapping) {
      return false;
    }

    return preview.requiresManualMapping || needsFocusedMapping;
  }, [currentManualMapping, needsFocusedMapping, preview]);

  function resetSelection(nextFile: File | null) {
    setSelectedFile(nextFile);
    setPreview(null);
    setManualMapping(null);
    setDuplicateStrategy("skip");
    setToast(null);
    setCommitted(null);
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
      setPhase("ready");
      setShouldFocusImportAction(true);
    } catch (error) {
      setPhase("idle");
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Preview failed.",
      });
    }
  }

  async function handleImport() {
    if (!selectedFile) {
      setToast({
        tone: "error",
        message: "Choose a file first so Hostlyx can review it before importing.",
      });
      return;
    }

    if (!preview) {
      setToast({
        tone: "error",
        message: "Preview the file first so you can review issues before importing.",
      });
      return;
    }

    if (!preview.canImport || actionableRows <= 0) {
      setToast({
        tone: "error",
        message: needsFocusedMapping
          ? "We need a quick column check before Hostlyx can continue."
          : "This file needs attention before Hostlyx can import it.",
      });
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
      setCommitted(payload.committed ?? null);
      setSelectedFile(null);
      setPreview(null);
      setManualMapping(null);

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

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }

    resetSelection(null);
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

  function scrollToMapping() {
    mappingRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function scrollToAttentionTarget() {
    const target =
      (needsFocusedMapping ? mappingRef.current : null) ??
      (preview && (preview.errorRows > 0 || preview.warningRows > 0 || preview.duplicateRows > 0)
        ? reviewRef.current
        : null) ??
      sourceDetectedRef.current ??
      panelRef.current;

    target?.scrollIntoView({
      behavior: "smooth",
      block: target === panelRef.current ? "start" : "center",
    });
  }

  useEffect(() => {
    if (!toast || toast.tone !== "error") {
      return;
    }

    const timer = window.setTimeout(() => {
      scrollToAttentionTarget();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [needsFocusedMapping, preview, toast]);

  useEffect(() => {
    if (!shouldFocusImportAction) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (needsFocusedMapping) {
        scrollToMapping();
        setShouldFocusImportAction(false);
        return;
      }

      if (actionableRows > 0) {
        readyToContinueRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        importButtonRef.current?.focus({ preventScroll: true });
      }

      setShouldFocusImportAction(false);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [actionableRows, needsFocusedMapping, shouldFocusImportAction]);

  if (committed) {
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

        <div className="workspace-card overflow-hidden rounded-[34px] border border-[var(--workspace-border)] bg-[linear-gradient(180deg,rgba(10,20,38,0.98),rgba(10,18,33,0.96))] p-6 sm:p-7">
          <div className="rounded-[28px] border border-emerald-400/18 bg-[radial-gradient(circle_at_top,rgba(125,211,197,0.18),transparent_58%),rgba(255,255,255,0.02)] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-400/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                  <ShieldCheck className="h-4 w-4" />
                  Import complete
                </div>
                <div>
                  <h3 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--workspace-text)]">
                    Your data is ready
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--workspace-muted)]">
                    Your financial overview has been updated.
                  </p>
                </div>
              </div>

              <div className="workspace-soft-card rounded-[24px] px-4 py-4 text-sm text-[var(--workspace-muted)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                  Source
                </p>
                <p className="mt-2 text-base font-medium text-[var(--workspace-text)]">{committed.sourceLabel}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ["Bookings imported", committed.bookingsImported, "text-[var(--workspace-text)]"],
                ["Expenses imported", committed.expensesImported, "text-[var(--workspace-text)]"],
                ["Rows skipped", committed.skippedRows, "text-[var(--workspace-muted)]"],
              ].map(([label, value, tone]) => (
                <div
                  key={String(label)}
                  className="rounded-[24px] border border-[var(--workspace-border)] bg-[rgba(255,255,255,0.03)] px-5 py-5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                    {label}
                  </p>
                  <p className={`mt-3 text-3xl font-semibold ${tone}`}>{formatCurrency(Number(value))}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="workspace-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                Go to dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => resetSelection(null)}
                className="workspace-button-secondary inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                Import another file
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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

      <div
        ref={panelRef}
        className="workspace-card overflow-hidden rounded-[34px] border border-[var(--workspace-border)] bg-[linear-gradient(180deg,rgba(10,20,38,0.98),rgba(10,18,33,0.96))] p-5 sm:p-7"
      >
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted)]">
                <Sparkles className="h-4 w-4 text-[var(--workspace-accent)]" />
                Import Center
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--workspace-text)] sm:text-4xl">
                  {title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--workspace-muted)]">{subtitle}</p>
              </div>
            </div>
            <div className="workspace-soft-card rounded-[26px] px-4 py-4 text-right text-sm text-[var(--workspace-muted)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                Supported
              </p>
              <p className="mt-2 text-base font-medium text-[var(--workspace-text)]">CSV & XLSX</p>
            </div>
          </div>

        <div className="mt-8 space-y-6">
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
            className={`workspace-soft-card group cursor-pointer rounded-[28px] border border-dashed p-6 transition sm:p-7 ${
              isDragging
                ? "border-[var(--workspace-accent)] bg-[rgba(125,211,197,0.08)]"
                : "border-[var(--workspace-border)] hover:border-[var(--workspace-accent)]/40 hover:bg-white/[0.03]"
            }`}
            onClick={openFilePicker}
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
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-[var(--workspace-border)] bg-[rgba(125,211,197,0.08)] text-[var(--workspace-accent)]">
                  {phase === "previewing" || phase === "importing" ? (
                    <LoaderCircle className="h-6 w-6 animate-spin" />
                  ) : (
                    <UploadCloud className="h-6 w-6 transition group-hover:scale-105" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-medium text-[var(--workspace-text)]">
                    {selectedFile ? selectedFile.name : "Drag and drop your file"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                    {selectedFile
                      ? `${formatFileSize(selectedFile.size)} uploaded${phase === "previewing" ? " • Analyzing your data..." : ""}`
                      : "Upload your Airbnb, Booking.com, or Hostlyx Excel export. Hostlyx will preview everything before saving anything."}
                  </p>
                  {!selectedFile ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {["Airbnb", "Booking.com", "Excel"].map((entry) => (
                        <span
                          key={entry}
                          className="rounded-full border border-[var(--workspace-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--workspace-muted)]"
                        >
                          {entry}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {phase === "previewing" ? (
                    <p className="mt-3 text-sm font-medium text-[var(--workspace-text)]">Analyzing your data...</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-3" onClick={(event) => event.stopPropagation()}>
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
                  {selectedFile ? "Replace file" : "Browse files"}
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
                  Analyzing your data...
                </>
              ) : (
                "Preview import"
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="workspace-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition"
            >
              Cancel
            </button>
          </div>

          {preview ? (
            <div className="space-y-5">
              <div
                ref={sourceDetectedRef}
                className="workspace-soft-card rounded-[28px] border border-[var(--workspace-border)] p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[var(--workspace-border)] bg-white/[0.04]">
                      {(() => {
                        const Icon = getSourcePresentation(preview.source).icon;
                        return <Icon className="h-5 w-5 text-[var(--workspace-accent)]" />;
                      })()}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                        Source detected
                      </p>
                      <p className="mt-2 text-xl font-semibold text-[var(--workspace-text)]">
                        {getSourcePresentation(preview.source).badge}
                      </p>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--workspace-muted)]">
                        {preview.requiresManualMapping
                          ? preview.manualMapping?.message
                          : getSourcePresentation(preview.source).description}
                      </p>
                      {needsFocusedMapping ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-amber-400/20 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-medium text-amber-100">
                            We need a quick column check before preview can continue.
                          </span>
                          <button
                            type="button"
                            onClick={scrollToMapping}
                            className="workspace-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
                          >
                            Map columns manually
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      preview.errorRows === 0 && preview.duplicateRows === 0 && preview.warningRows === 0
                        ? "border-emerald-400/24 bg-emerald-400/10 text-emerald-100"
                        : "border-amber-400/24 bg-amber-400/10 text-amber-100"
                    }`}
                  >
                    {preview.requiresManualMapping
                      ? "Manual mapping"
                      : preview.errorRows === 0 && preview.duplicateRows === 0 && preview.warningRows === 0
                        ? "Ready to import"
                        : "Needs review"}
                  </span>
                </div>
              </div>

              {shouldShowManualMapping ? (
                <div
                  ref={mappingRef}
                  className={`rounded-[28px] border p-5 sm:p-6 ${
                    needsFocusedMapping
                      ? "border-amber-400/20 bg-amber-300/[0.08]"
                      : "border-[var(--workspace-accent)]/20 bg-[rgba(125,211,197,0.06)]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[var(--workspace-text)]">Map your columns</p>
                      <p className="text-sm leading-6 text-[var(--workspace-muted)]">
                        {needsFocusedMapping
                          ? "Hostlyx read the file, but key columns still need your review before we can show a clean preview."
                          : preview.manualMapping?.message}
                      </p>
                    </div>
                    {needsFocusedMapping ? (
                      <span className="rounded-full border border-amber-400/20 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-medium text-amber-100">
                        Required now
                      </span>
                    ) : null}
                  </div>

                  {!needsFocusedMapping ? (
                    <p className="mt-4 text-sm leading-6 text-[var(--workspace-muted)]">
                      {preview.manualMapping?.message}
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {([
                      ["guestName", "Guest Name", true],
                      ["checkIn", "Check-in", true],
                      ["checkOut", "Check-out", true],
                      ["grossRevenue", "Revenue (gross)", true],
                      ["payout", "Payout", false],
                      ["propertyName", "Property", false],
                    ] as Array<[MappingField, string, boolean]>).map(([field, label, required]) => {
                      const issue = currentManualIssues[field];
                      const hasError = issue?.severity === "error";
                      const hasWarning = issue?.severity === "warning";

                      return (
                        <label key={field} className="space-y-2">
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                            {label}
                            {required ? (
                              <span className="ml-1 text-[var(--workspace-accent)]">*</span>
                            ) : (
                              <span className="ml-1 text-[10px] text-[var(--workspace-muted)]/80">(optional)</span>
                            )}
                          </span>
                          <select
                            value={currentManualMapping?.[field] ?? ""}
                            onChange={(event) => updateManualField(field, event.target.value)}
                            className={`w-full rounded-[18px] border bg-[var(--workspace-panel)] px-4 py-3 text-sm text-[var(--workspace-text)] outline-none transition focus:border-[var(--workspace-accent)] ${
                              hasError
                                ? "border-rose-400/30"
                                : hasWarning
                                  ? "border-amber-400/30"
                                  : "border-[var(--workspace-border)]"
                            }`}
                          >
                            <option value="">Select a column</option>
                            {(preview.manualMapping?.columns ?? []).map((column) => (
                              <option key={`${field}-${column.index}`} value={column.index}>
                                {column.label}
                              </option>
                            ))}
                          </select>
                          {issue ? (
                            <p
                              className={`text-xs leading-5 ${
                                issue.severity === "error"
                                  ? "text-rose-100/90"
                                  : "text-amber-100/85"
                              }`}
                            >
                              {issue.message}
                            </p>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--workspace-border)] bg-white/[0.02] px-4 py-4">
                    <p className="text-sm text-[var(--workspace-muted)]">
                      {currentManualReady
                        ? "Required fields are mapped. Preview again to continue."
                        : "Map Guest Name, Check-in, Check-out, and Revenue with valid columns to continue."}
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

              {!needsFocusedMapping ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Bookings detected", preview.importableRows, "text-[var(--workspace-text)]", "border-[var(--workspace-border)] bg-[var(--workspace-panel)]"],
                    ["Expenses detected", preview.expensesDetected, "text-[var(--workspace-text)]", "border-[var(--workspace-border)] bg-[var(--workspace-panel)]"],
                    [
                      preview.errorRows > 0 ? "Errors" : "Warnings",
                      preview.errorRows > 0 ? preview.errorRows : preview.warningRows,
                      preview.errorRows > 0 ? "text-rose-100" : "text-amber-100",
                      preview.errorRows > 0
                        ? "border-rose-400/20 bg-rose-300/[0.08]"
                        : "border-amber-400/20 bg-amber-300/[0.08]",
                    ],
                    ["Duplicates", preview.duplicateRows, "text-[var(--workspace-text)]", "border-[var(--workspace-border)] bg-[var(--workspace-panel)]"],
                  ].map(([label, value, tone, surface]) => (
                    <div
                      key={String(label)}
                      className={`rounded-[22px] border px-4 py-5 ${surface}`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                        {label}
                      </p>
                      <p className={`mt-3 text-3xl font-semibold ${tone}`}>
                        {value}
                      </p>
                      {label === "Errors" && preview.errorRows > 0 ? (
                        <p className="mt-2 text-xs leading-5 text-rose-100/75">These rows will be skipped unless you fix the source file.</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {!needsFocusedMapping && preview.errorRows > 0 ? (
                <div className="rounded-[24px] border border-rose-400/18 bg-rose-300/[0.07] p-4 sm:p-5">
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium text-rose-50/95">
                      {actionableRows} row{actionableRows === 1 ? "" : "s"} are ready. {preview.errorRows} row{preview.errorRows === 1 ? "" : "s"} still need changes in the source file.
                    </p>
                    <p className="text-sm leading-6 text-rose-50/75">
                      You can continue now and Hostlyx will import the clean rows only, or fix those specific rows in the spreadsheet and upload again.
                    </p>
                    <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleImport}
                        disabled={actionableRows <= 0 || phase === "importing" || phase === "previewing"}
                        className="workspace-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[220px]"
                      >
                        {phase === "importing" ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            {importButtonLabel}
                          </>
                        ) : (
                          importButtonLabel
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const reviewElement = reviewRef.current;
                          if (!reviewElement) {
                            return;
                          }
                          reviewElement.open = true;
                          reviewElement.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }}
                        className="workspace-button-secondary inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition sm:min-w-[180px]"
                      >
                        Review the {preview.errorRows} issue{preview.errorRows === 1 ? "" : "s"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {!needsFocusedMapping && preview.duplicateRows > 0 ? (
                <div className="rounded-[24px] border border-amber-400/20 bg-amber-300/[0.08] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-100">Duplicate review</p>
                      <p className="mt-1 text-xs leading-6 text-amber-50/80">
                        Hostlyx found {preview.duplicateRows} booking
                        {preview.duplicateRows === 1 ? "" : "s"} that look already imported or repeated in this
                        file.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-3 text-sm text-amber-50/85">
                        <button
                          type="button"
                          onClick={() =>
                            setDuplicateStrategy((current) => (current === "skip" ? "import" : "skip"))
                          }
                          className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                            duplicateStrategy === "skip"
                              ? "border-[var(--workspace-accent)] bg-[rgba(125,211,197,0.18)]"
                              : "border-white/10 bg-white/10"
                          }`}
                          aria-pressed={duplicateStrategy === "skip"}
                        >
                          <span
                            className={`h-5 w-5 rounded-full bg-white transition ${
                              duplicateStrategy === "skip" ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        Skip duplicates automatically
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}

              {!needsFocusedMapping ? (
                <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                  <div
                    ref={readyToContinueRef}
                    className="rounded-[24px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-5"
                  >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                      Preview
                    </p>
                    <p className="mt-2 text-lg font-medium text-[var(--workspace-text)]">First normalized rows</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                      A quick look at the first rows Hostlyx is ready to save.
                    </p>
                  </div>

                  {preview.previewRows.length > 0 ? (
                    <div className="mt-5 overflow-x-auto">
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
                        <tbody className="divide-y divide-[var(--workspace-border)]/70 text-[var(--workspace-text)]">
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
                    <div className="mt-5 rounded-[20px] border border-[var(--workspace-border)] bg-white/[0.02] px-4 py-4 text-sm text-[var(--workspace-muted)]">
                      No normalized booking rows are ready yet.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <details
                    ref={reviewRef}
                    open={preview.warningRows + preview.duplicateRows + preview.errorRows > 0}
                    className="rounded-[24px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-5"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                          Review
                        </p>
                        <p className="mt-2 text-lg font-medium text-[var(--workspace-text)]">
                          Review potential issues
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                          Errors need a quick fix in the source file. Valid rows can still be imported right away.
                        </p>
                      </div>
                      <ChevronDown className="h-5 w-5 text-[var(--workspace-muted)]" />
                    </summary>

                    <div className="mt-5 space-y-3">
                      {reviewItems.length > 0 ? (
                        reviewItems.map((row) => (
                          <div
                            key={row.id}
                            className={`rounded-[18px] border px-4 py-4 text-sm ${
                              row.section === "errors"
                                ? "border-rose-400/18 bg-rose-300/[0.07] text-rose-50/90"
                                : row.section === "duplicates"
                                  ? "border-amber-400/18 bg-amber-300/[0.07] text-amber-50/90"
                                  : "border-[var(--workspace-border)] bg-white/[0.03] text-[var(--workspace-text)]"
                            }`}
                          >
                            <p className="font-medium">{row.title}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.14em] opacity-70">
                              Row {row.rowIndex} • {row.subtitle}
                            </p>
                            <p className="mt-2 text-sm opacity-85">{row.reasons[0]}</p>
                            {row.section === "errors" ? (
                              <p className="mt-2 text-xs uppercase tracking-[0.12em] opacity-65">
                                Fix this row in the source file and upload again if you want it included.
                              </p>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[18px] border border-emerald-400/18 bg-emerald-400/[0.08] px-4 py-4 text-sm text-emerald-50/90">
                          Your preview looks clean. No issues need attention before import.
                        </div>
                      )}
                    </div>
                  </details>

                  <div className="rounded-[24px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                          Ready to continue
                        </p>
                        <p className="mt-2 text-lg font-medium text-[var(--workspace-text)]">
                          {actionableRows} clean row{actionableRows === 1 ? "" : "s"} ready to import
                        </p>
                      </div>
                      <p className="text-sm text-[var(--workspace-muted)]">
                        {preview.errorRows > 0
                          ? `${preview.errorRows} error row${preview.errorRows === 1 ? "" : "s"} will be skipped automatically.`
                          : preview.skippedRows > 0
                            ? `${preview.skippedRows} row${preview.skippedRows === 1 ? "" : "s"} will be skipped.`
                            : "Nothing will be saved until you confirm."}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        ref={importButtonRef}
                        type="button"
                        onClick={handleImport}
                        disabled={actionableRows <= 0 || phase === "importing" || phase === "previewing"}
                        className="workspace-button-primary inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {phase === "importing" ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            {importButtonLabel}
                          </>
                        ) : actionableRows > 0 ? (
                          importButtonLabel
                        ) : (
                          "Map columns manually"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="workspace-button-secondary inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="workspace-soft-card rounded-[28px] border border-[var(--workspace-border)] px-6 py-6 text-sm text-[var(--workspace-muted)]">
              Upload a file to see detected source, a clean import summary, and a preview before anything is saved.
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
