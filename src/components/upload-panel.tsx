"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  AlertTriangle,
  BedDouble,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import type { PropertyDefinition } from "@/lib/types";
import type { ImportEditableBooking, ImportRowResolution } from "@/lib/import/types";
import { Modal } from "@/components/modal";
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

type PreviewCalendarMatch = {
  rowIndex: number;
  matchType: "exact" | "probable" | "weak" | "none" | "conflict";
  score: number;
  isConflict: boolean;
  calendarEventId: number;
  source: "airbnb" | "booking" | "vrbo" | "other";
  summary: string;
  startDate: string;
  endDate: string;
  eventType: "booking" | "blocked" | "unknown";
  message: string;
  reasons: string[];
};

type PreviewRow = {
  guestName: string;
  channel: string;
  checkIn: string;
  checkOut: string;
  grossRevenue: number;
  payout: number;
  status: "new" | "matched" | "duplicate" | "conflict" | "warning";
};

type ReviewSection = "valid" | "warnings" | "duplicates" | "conflicts" | "errors";

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
  canResolve?: boolean;
  booking?: ImportEditableBooking;
};

type PreviewTableRow = {
  id: string;
  rowIndex: number;
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  channel: string;
  grossRevenue: number;
  payout: number;
  status: "new" | "matched" | "duplicate" | "conflict" | "warning";
  matchLabel: string;
  matchScore: number | null;
  matchType: PreviewCalendarMatch["matchType"] | null;
  reasons: string[];
  booking: ImportEditableBooking;
  calendarMatch: PreviewCalendarMatch | null;
  canResolve: boolean;
  decisionStatus: "auto-approved" | "needs-review" | "blocked";
  decisionReason: string;
  isSelectedByDefault: boolean;
  isDisabled: boolean;
};

type ImportPreviewPayload = {
  source: "airbnb" | "booking" | "generic" | "financial_statement" | "unknown";
  sourceLabel: string;
  fileName: string;
  requiresManualMapping: boolean;
  blocksImport: boolean;
  blockMessage: string | null;
  manualMapping: ManualMappingPreview | null;
  totalRowsRead: number;
  validRows: number;
  warningRows: number;
  duplicateRows: number;
  matchedRows: number;
  conflictRows: number;
  newRows: number;
  errorRows: number;
  skippedRows: number;
  expensesDetected: number;
  importableRows: number;
  financialStatement: null | {
    source: "airbnb" | "booking";
    period: {
      start: string;
      end: string;
      label: string;
    };
    totalPayout: number;
    totalFees: number;
    totalTaxes: number;
    currency: string;
    rawData: string;
  };
  previewRows: PreviewRow[];
  tableRows: PreviewTableRow[];
  reviewRows: Record<ReviewSection, ReviewRow[]>;
  warnings: PreviewWarning[];
  duplicates: PreviewDuplicate[];
  calendarMatches: PreviewCalendarMatch[];
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
  financialDocumentsImported?: number;
};

type ImportCompletePayload = {
  importedFilesCount: number;
  propertyName: string;
  hasRemainingIssues: boolean;
  bookingsImported: number;
  expensesImported: number;
  skippedRows: number;
  financialDocumentsImported: number;
};

type BookingFixDraft = {
  rowIndex: number;
  title: string;
  reasons: string[];
  booking: ImportEditableBooking;
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

function formatCompactDate(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getMatchTone(matchType: PreviewCalendarMatch["matchType"] | null) {
  if (matchType === "exact" || matchType === "probable") {
    return "text-teal-100";
  }

  if (matchType === "weak") {
    return "text-amber-100";
  }

  if (matchType === "conflict") {
    return "text-rose-100";
  }

  return "text-[var(--workspace-muted)]";
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
    case "financial_statement":
      return {
        icon: CircleDollarSign,
        badge: "Financial statement",
        description:
          "This looks like a financial statement, not individual bookings.",
      };
    default:
      return {
        icon: Sparkles,
        badge: "Mapped file",
        description: "Your file needed a quick column mapping, and Hostlyx prepared it for review.",
      };
  }
}

function getPreviewStatusPill(status: PreviewRow["status"]) {
  if (status === "matched") {
    return "border-teal-300/24 bg-teal-300/[0.08] text-teal-100";
  }

  if (status === "duplicate") {
    return "border-amber-300/24 bg-amber-300/[0.08] text-amber-100";
  }

  if (status === "conflict") {
    return "border-rose-400/24 bg-rose-400/[0.08] text-rose-100";
  }

  if (status === "warning") {
    return "border-amber-200/24 bg-amber-200/[0.08] text-amber-50";
  }

  return "border-white/10 bg-white/[0.04] text-[var(--workspace-text)]";
}

function getPreviewStatusLabel(status: PreviewRow["status"]) {
  switch (status) {
    case "matched":
      return "Matched";
    case "duplicate":
      return "Duplicate";
    case "conflict":
      return "Conflict";
    case "warning":
      return "Warning";
    default:
      return "New";
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
  onImportComplete?: (payload: ImportCompletePayload) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const toastRef = useRef<HTMLDivElement | null>(null);
  const sourceDetectedRef = useRef<HTMLDivElement | null>(null);
  const mappingRef = useRef<HTMLDivElement | null>(null);
  const reviewRef = useRef<HTMLDivElement | null>(null);
  const readyToContinueRef = useRef<HTMLDivElement | null>(null);
  const importButtonRef = useRef<HTMLButtonElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPropertyName, setSelectedPropertyName] = useState(properties[0]?.name ?? "");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [preview, setPreview] = useState<ImportPreviewPayload | null>(null);
  const [manualMapping, setManualMapping] = useState<ManualMappingPayload | null>(null);
  const [toast, setToast] = useState<UploadToast | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [committed, setCommitted] = useState<ImportCommittedPayload | null>(null);
  const [shouldFocusImportAction, setShouldFocusImportAction] = useState(false);
  const [rowResolutions, setRowResolutions] = useState<ImportRowResolution[]>([]);
  const [bookingFixDraft, setBookingFixDraft] = useState<BookingFixDraft | null>(null);
  const [selectedTableRowId, setSelectedTableRowId] = useState<string | null>(null);
  const [approvedRowIds, setApprovedRowIds] = useState<string[]>([]);

  const validExpenseRows = useMemo(() => {
    return preview?.reviewRows.valid.filter((row) => row.rowType === "expense").length ?? 0;
  }, [preview?.reviewRows.valid]);

  const actionableRows = useMemo(() => {
    if (!preview) {
      return 0;
    }

    return approvedRowIds.length + validExpenseRows;
  }, [approvedRowIds.length, preview, validExpenseRows]);

  const isFinancialPreview = preview?.source === "financial_statement";
  const isFinancialStatementReady = Boolean(
    preview &&
      preview.source === "financial_statement" &&
      !preview.blocksImport &&
      preview.financialStatement &&
      preview.canImport,
  );

  const importButtonLabel = useMemo(() => {
    if (phase === "importing") {
      return "Importing data...";
    }

    if (!preview) {
      return "Import data";
    }

    if (isFinancialStatementReady) {
      return "Save financial statement";
    }

    if (preview.blocksImport) {
      return "Use a reservations export";
    }

    if (actionableRows > 0) {
      return `Import ${actionableRows} approved row${actionableRows === 1 ? "" : "s"}`;
    }

    return "Map columns manually";
  }, [actionableRows, isFinancialStatementReady, phase, preview]);

  const selectedTableRow = useMemo(() => {
    if (!preview?.tableRows.length) {
      return null;
    }

    return (
      preview.tableRows.find((row) => row.id === selectedTableRowId) ??
      preview.tableRows[0] ??
      null
    );
  }, [preview?.tableRows, selectedTableRowId]);

  const needsFocusedMapping = useMemo(() => {
    if (!preview?.manualMapping) {
      return false;
    }

    if (preview.blocksImport) {
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

  async function requestPreview(options?: {
    preserveToast?: boolean;
    focusImportAction?: boolean;
    rowResolutionsOverride?: ImportRowResolution[];
  }) {
    if (!selectedFile) {
      return null;
    }

    setPhase("previewing");
    if (!options?.preserveToast) {
      setToast(null);
    }

    try {
      const formData = new FormData();
      formData.set("action", "preview");
      if (manualMapping) {
        formData.set("manualMapping", JSON.stringify(manualMapping));
      }
      const effectiveRowResolutions = options?.rowResolutionsOverride ?? rowResolutions;
      if (effectiveRowResolutions.length > 0) {
        formData.set("rowResolutions", JSON.stringify(effectiveRowResolutions));
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
      setPhase("ready");
      setShouldFocusImportAction(options?.focusImportAction ?? true);
      return payload.preview;
    } catch (error) {
      setPhase("idle");
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Preview failed.",
      });
      return null;
    }
  }

  function resetSelection(nextFile: File | null) {
    setSelectedFile(nextFile);
    setPreview(null);
    setManualMapping(null);
    setRowResolutions([]);
    setBookingFixDraft(null);
    setSelectedTableRowId(null);
    setApprovedRowIds([]);
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

    await requestPreview({
      focusImportAction: true,
    });
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

    if (preview.blocksImport) {
      setToast({
        tone: "error",
        message: preview.blockMessage ?? "This file is not the right format for booking imports.",
      });
      return;
    }

    if (!preview.canImport || actionableRows <= 0) {
      setToast({
        tone: "error",
        message: needsFocusedMapping
          ? "We need a quick column check before Hostlyx can continue."
          : "Approve at least one safe row before importing, or fix the rows that still need review.",
      });
      return;
    }

    setPhase("importing");
    setToast(null);

    try {
      const formData = new FormData();
      formData.set("action", "commit");
      formData.set("propertyName", selectedPropertyName);
      formData.set(
        "approvedRowIndexes",
        JSON.stringify(
          preview.tableRows
            .filter((row) => approvedRowIds.includes(row.id))
            .map((row) => row.rowIndex),
        ),
      );
      if (manualMapping) {
        formData.set("manualMapping", JSON.stringify(manualMapping));
      }
      if (rowResolutions.length > 0) {
        formData.set("rowResolutions", JSON.stringify(rowResolutions));
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

      const committedPayload = payload.committed ?? null;
      const hasRemainingIssues =
        preview.errorRows > 0 ||
        preview.skippedRows > 0 ||
        preview.duplicateRows > 0 ||
        preview.conflictRows > 0;

      setToast({
        tone: "success",
        message: hasRemainingIssues
          ? `Imported ${committedPayload?.bookingsImported ?? 0} booking${committedPayload?.bookingsImported === 1 ? "" : "s"} and ${committedPayload?.expensesImported ?? 0} expense${committedPayload?.expensesImported === 1 ? "" : "s"}. The remaining rows still need changes in the source file.`
          : payload.message ?? "Import completed.",
      });

      if (refreshOnSuccess) {
        router.refresh();
      }

      onImportComplete?.({
        importedFilesCount: 1,
        propertyName: selectedPropertyName,
        hasRemainingIssues,
        bookingsImported: committedPayload?.bookingsImported ?? 0,
        expensesImported: committedPayload?.expensesImported ?? 0,
        skippedRows: committedPayload?.skippedRows ?? 0,
        financialDocumentsImported: committedPayload?.financialDocumentsImported ?? 0,
      });

      if (hasRemainingIssues) {
        await requestPreview({
          preserveToast: true,
          focusImportAction: false,
        });
        return;
      }

      setPhase("idle");
      setCommitted(committedPayload);
      setSelectedFile(null);
      setPreview(null);
      setManualMapping(null);
      setRowResolutions([]);
      setBookingFixDraft(null);
      setApprovedRowIds([]);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
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

  function openBookingFix(row: ReviewRow) {
    if (!row.booking) {
      return;
    }

    setBookingFixDraft({
      rowIndex: row.rowIndex,
      title: row.title,
      reasons: row.reasons,
      booking: { ...row.booking },
    });
  }

  function updateBookingFixField(field: keyof ImportEditableBooking, value: string) {
    setBookingFixDraft((current) => {
      if (!current) {
        return current;
      }

      const isNumericField =
        field === "guests" ||
        field === "grossRevenue" ||
        field === "platformFee" ||
        field === "cleaningFee" ||
        field === "taxAmount" ||
        field === "payout";

      return {
        ...current,
        booking: {
          ...current.booking,
          [field]: isNumericField
            ? value === ""
              ? 0
              : Number(value)
            : value,
        },
      };
    });
  }

  async function saveBookingFix() {
    if (!bookingFixDraft) {
      return;
    }

    const nextRowResolutions = rowResolutions.filter(
      (resolution) =>
        !(resolution.rowType === "booking" && resolution.rowIndex === bookingFixDraft.rowIndex),
    );
    nextRowResolutions.push({
      rowType: "booking",
      rowIndex: bookingFixDraft.rowIndex,
      action: "override",
      booking: bookingFixDraft.booking,
    });

    setRowResolutions(nextRowResolutions);

    setBookingFixDraft(null);
    await requestPreview({
      preserveToast: true,
      focusImportAction: false,
      rowResolutionsOverride: nextRowResolutions,
    });
  }

  async function skipBookingRow(rowIndex: number) {
    const nextRowResolutions = rowResolutions.filter(
      (resolution) => !(resolution.rowType === "booking" && resolution.rowIndex === rowIndex),
    );
    nextRowResolutions.push({
      rowType: "booking",
      rowIndex,
      action: "skip",
    });

    setRowResolutions(nextRowResolutions);

    setBookingFixDraft(null);
    setApprovedRowIds((current) => current.filter((rowId) => rowId !== `booking-${rowIndex}`));
    await requestPreview({
      preserveToast: true,
      focusImportAction: false,
      rowResolutionsOverride: nextRowResolutions,
    });
  }

  function openSelectedRowFix() {
    if (!selectedTableRow) {
      return;
    }

    setBookingFixDraft({
      rowIndex: selectedTableRow.rowIndex,
      title: selectedTableRow.guestName,
      reasons: selectedTableRow.reasons,
      booking: { ...selectedTableRow.booking },
    });
  }

  function toggleRowApproval(rowId: string) {
    const row = preview?.tableRows.find((entry) => entry.id === rowId);
    if (!row || row.isDisabled) {
      return;
    }

    setApprovedRowIds((current) =>
      current.includes(rowId) ? current.filter((entry) => entry !== rowId) : [...current, rowId],
    );
  }

  function scrollToMapping() {
    mappingRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function scrollToImportAction() {
    readyToContinueRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.setTimeout(() => {
      importButtonRef.current?.focus({ preventScroll: true });
    }, 80);
  }

  function scrollToAttentionTarget() {
    const target =
      (needsFocusedMapping ? mappingRef.current : null) ??
      (preview &&
      (preview.errorRows > 0 ||
        preview.warningRows > 0 ||
        preview.duplicateRows > 0 ||
        preview.conflictRows > 0)
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
      const target = toastRef.current ?? panelRef.current;
      target?.scrollIntoView({
        behavior: "smooth",
        block: target === panelRef.current ? "start" : "center",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!committed || !onCancel) {
      return;
    }

    const timer = window.setTimeout(() => {
      onCancel();
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [committed, onCancel]);

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
        scrollToImportAction();
      }

      setShouldFocusImportAction(false);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [actionableRows, needsFocusedMapping, shouldFocusImportAction]);

  useEffect(() => {
    if (!preview?.tableRows.length) {
      setSelectedTableRowId(null);
      return;
    }

    setSelectedTableRowId((current) =>
      preview.tableRows.some((row) => row.id === current)
        ? current
        : preview.tableRows.find((row) => row.decisionStatus === "needs-review")?.id ??
          preview.tableRows[0]?.id ??
          null,
    );
  }, [preview?.tableRows]);

  useEffect(() => {
    if (!preview?.tableRows.length) {
      setApprovedRowIds([]);
      return;
    }

    setApprovedRowIds((current) => {
      const visibleApproved = current.filter((rowId) =>
        preview.tableRows.some((row) => row.id === rowId && !row.isDisabled),
      );
      const defaults = preview.tableRows
        .filter((row) => row.isSelectedByDefault && !row.isDisabled)
        .map((row) => row.id);

      if (visibleApproved.length > 0) {
        return Array.from(new Set([...visibleApproved, ...defaults]));
      }

      return defaults;
    });
  }, [preview?.tableRows]);

  if (committed) {
    return (
      <div className="relative">
        <div className="workspace-card overflow-hidden rounded-[34px] border border-[var(--workspace-border)] bg-[linear-gradient(180deg,rgba(10,20,38,0.98),rgba(10,18,33,0.96))] p-6 sm:p-7">
          {toast ? (
            <div
              ref={toastRef}
              className={`mb-5 rounded-[24px] border px-4 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.22)] ${
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
          ) : null}

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
              {(
                committed.financialDocumentsImported
                  ? [
                      ["Statements imported", committed.financialDocumentsImported, "text-[var(--workspace-text)]"],
                      ["Bookings imported", committed.bookingsImported, "text-[var(--workspace-text)]"],
                      ["Rows skipped", committed.skippedRows, "text-[var(--workspace-muted)]"],
                    ]
                  : [
                      ["Bookings imported", committed.bookingsImported, "text-[var(--workspace-text)]"],
                      ["Expenses imported", committed.expensesImported, "text-[var(--workspace-text)]"],
                      ["Rows skipped", committed.skippedRows, "text-[var(--workspace-muted)]"],
                    ]
              ).map(([label, value, tone]) => (
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

            {onCancel ? (
              <p className="mt-4 text-sm text-[var(--workspace-muted)]">
                Everything imported perfectly. Closing this window...
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={panelRef}
        className="workspace-card overflow-hidden rounded-[34px] border border-[var(--workspace-border)] bg-[linear-gradient(180deg,rgba(10,20,38,0.98),rgba(10,18,33,0.96))] p-5 sm:p-7"
      >
        {toast ? (
          <div
            ref={toastRef}
            className={`mb-5 rounded-[24px] border px-4 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.22)] ${
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
        ) : null}

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
                        {preview.blocksImport
                          ? preview.blockMessage
                          : preview.source === "financial_statement"
                          ? "This looks like a financial statement, not individual bookings."
                          : preview.requiresManualMapping
                          ? preview.manualMapping?.message
                          : getSourcePresentation(preview.source).description}
                      </p>
                      {preview.blocksImport ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-rose-400/20 bg-rose-300/[0.08] px-3 py-1.5 text-xs font-medium text-rose-100">
                            {preview.source === "financial_statement"
                              ? "We still need a readable payout total"
                              : "Use a reservations or earnings export instead"}
                          </span>
                        </div>
                      ) : isFinancialStatementReady ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-[var(--workspace-accent)]/24 bg-[rgba(125,211,197,0.12)] px-3 py-1.5 text-xs font-medium text-[var(--workspace-accent)]">
                            Financial statement ready
                          </span>
                          <button
                            type="button"
                            onClick={handleImport}
                            disabled={phase === "importing" || phase === "previewing"}
                            className="workspace-button-primary inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {phase === "importing" ? "Saving statement..." : "Save financial statement"}
                          </button>
                        </div>
                      ) : needsFocusedMapping ? (
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
                      preview.blocksImport
                        ? "border-rose-400/24 bg-rose-400/10 text-rose-100"
                        : preview.source === "financial_statement"
                        ? "border-[var(--workspace-accent)]/24 bg-[rgba(125,211,197,0.12)] text-[var(--workspace-accent)]"
                        : preview.errorRows === 0 && preview.duplicateRows === 0 && preview.warningRows === 0
                        ? "border-emerald-400/24 bg-emerald-400/10 text-emerald-100"
                        : "border-amber-400/24 bg-amber-400/10 text-amber-100"
                    }`}
                  >
                    {preview.blocksImport
                      ? "Wrong file type"
                      : isFinancialStatementReady
                      ? "Statement ready"
                      : preview.source === "financial_statement"
                      ? "Needs payout total"
                      : preview.requiresManualMapping
                      ? "Manual mapping"
                      : preview.errorRows === 0 && preview.duplicateRows === 0 && preview.warningRows === 0
                        ? "Ready to import"
                        : "Needs review"}
                  </span>
                </div>
              </div>

              {preview.blocksImport ? (
                <div className="rounded-[28px] border border-rose-400/18 bg-rose-300/[0.07] p-5 sm:p-6">
                  <p className="text-sm font-medium text-rose-50/95">
                    {preview.source === "financial_statement"
                      ? "Hostlyx recognized a financial statement, but we still need a readable payout total before it can be imported."
                      : "This file is useful for invoices and VAT records, but it is not the right source for bookings."}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-rose-50/75">
                    {preview.source === "financial_statement"
                      ? "Try a cleaner payout or statement export, or one that includes the actual amount paid out, then upload it again."
                      : "Export your Airbnb reservations or earnings file instead, then upload it here to populate bookings, payout, and stay dates."}
                  </p>
                </div>
              ) : null}

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

              {isFinancialPreview && !preview.blocksImport && preview.financialStatement ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Statement source", preview.financialStatement.source === "airbnb" ? "Airbnb" : "Booking.com", "text-[var(--workspace-text)]", "border-[var(--workspace-border)] bg-[var(--workspace-panel)]"],
                      ["Actual payout", formatCurrency(preview.financialStatement.totalPayout), "text-teal-100", "border-[var(--workspace-accent)]/18 bg-[rgba(125,211,197,0.08)]"],
                      ["Fees detected", formatCurrency(preview.financialStatement.totalFees), "text-amber-100", "border-amber-400/20 bg-amber-300/[0.08]"],
                      ["Taxes detected", formatCurrency(preview.financialStatement.totalTaxes), "text-[var(--workspace-text)]", "border-[var(--workspace-border)] bg-[var(--workspace-panel)]"],
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
                        {label === "Statement source" ? (
                          <p className="mt-2 text-xs leading-5 text-[var(--workspace-muted)]">
                            {preview.financialStatement?.period.label}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-[24px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                        Statement summary
                      </p>
                      <p className="mt-2 text-lg font-medium text-[var(--workspace-text)]">
                        {preview.financialStatement.period.label}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                        Hostlyx will save this document as a financial statement, separate from bookings, and use it for Reconcile.
                      </p>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="rounded-[20px] border border-[var(--workspace-border)] bg-white/[0.02] px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                            What gets saved
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--workspace-text)]">
                            Actual payout, fees, taxes, source, currency, and statement period.
                          </p>
                        </div>
                        <div className="rounded-[20px] border border-[var(--workspace-border)] bg-white/[0.02] px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                            What will not happen
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--workspace-text)]">
                            Hostlyx will not create bookings from this file or mix it into operational calendar events.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      ref={readyToContinueRef}
                      className="rounded-[24px] border border-[var(--workspace-accent)]/18 bg-[rgba(125,211,197,0.07)] p-5"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                        Ready to continue
                      </p>
                      <p className="mt-2 text-lg font-medium text-[var(--workspace-text)]">
                        1 financial statement ready to import
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                        Nothing will be saved until you confirm this financial statement import.
                      </p>

                      <div className="mt-5 rounded-[18px] border border-[var(--workspace-accent)]/18 bg-[rgba(125,211,197,0.08)] px-4 py-4 text-sm text-[var(--workspace-text)]">
                        This file will feed Reconcile so you can compare expected payout against what Airbnb or Booking.com actually paid out.
                      </div>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <button
                          ref={importButtonRef}
                          type="button"
                          onClick={handleImport}
                          disabled={!isFinancialStatementReady || phase === "importing" || phase === "previewing"}
                          className="workspace-button-primary inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {phase === "importing" ? (
                            <>
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              Save financial statement
                            </>
                          ) : (
                            "Save financial statement"
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
              ) : !needsFocusedMapping && !preview.blocksImport ? (
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                          Import review
                        </p>
                        <p className="mt-2 text-lg font-medium text-[var(--workspace-text)]">
                          {preview.sourceLabel} · {preview.fileName}
                        </p>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--workspace-muted)]">
                          We checked your file against synced calendar data to catch duplicates and conflicts before import.
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-[var(--workspace-border)] bg-white/[0.03] px-4 py-4 text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                          Total rows found
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-[var(--workspace-text)]">
                          {preview.totalRowsRead}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {[
                        ["New bookings", String(preview.newRows), "border-white/10 bg-white/[0.02] text-[var(--workspace-text)]"],
                        ["Matched to calendar", String(preview.matchedRows), "border-teal-400/18 bg-teal-300/[0.08] text-teal-100"],
                        ["Duplicates", String(preview.duplicateRows), "border-amber-400/18 bg-amber-300/[0.08] text-amber-100"],
                        ["Conflicts", String(preview.conflictRows), "border-rose-400/18 bg-rose-300/[0.08] text-rose-100"],
                        ["Warnings", String(preview.warningRows + preview.errorRows), "border-yellow-300/18 bg-yellow-300/[0.08] text-yellow-100"],
                      ].map(([label, value, classes]) => (
                        <div key={String(label)} className={`rounded-[20px] border px-4 py-4 ${classes}`}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted)]">
                            {label}
                          </p>
                          <p className="mt-3 text-3xl font-semibold">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
                    <div className="rounded-[24px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                            Main preview
                          </p>
                          <p className="mt-2 text-lg font-medium text-[var(--workspace-text)]">
                            Booking rows before import
                          </p>
                        </div>
                        <p className="text-sm text-[var(--workspace-muted)]">
                          Select a row to inspect the match and decide what to do.
                        </p>
                      </div>

                      <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="text-[11px] uppercase tracking-[0.16em] text-[var(--workspace-muted)]">
                            <tr>
                              <th className="pb-3 pr-4 font-medium">Status</th>
                              <th className="pb-3 pr-4 font-medium">Guest</th>
                              <th className="pb-3 pr-4 font-medium">Property</th>
                              <th className="pb-3 pr-4 font-medium">Check-in</th>
                              <th className="pb-3 pr-4 font-medium">Check-out</th>
                              <th className="pb-3 pr-4 font-medium">Channel</th>
                              <th className="pb-3 pr-4 font-medium">Gross Revenue</th>
                              <th className="pb-3 pr-4 font-medium">Payout</th>
                              <th className="pb-3 font-medium">Match</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--workspace-border)]/60 text-[var(--workspace-text)]">
                            {preview.tableRows.map((row) => {
                              const isSelected = selectedTableRow?.id === row.id;
                              const isApproved = approvedRowIds.includes(row.id);
                              return (
                                <tr
                                  key={row.id}
                                  onClick={() => setSelectedTableRowId(row.id)}
                                  className={`cursor-pointer transition ${
                                    row.isDisabled
                                      ? "opacity-65"
                                      : isSelected
                                        ? "bg-white/[0.05]"
                                        : "hover:bg-white/[0.03]"
                                  }`}
                                >
                                  <td className="py-4 pr-4">
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          toggleRowApproval(row.id);
                                        }}
                                        disabled={row.isDisabled}
                                        className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                                          row.isDisabled
                                            ? "cursor-not-allowed border-white/8 bg-white/[0.03]"
                                            : isApproved
                                              ? "border-[var(--workspace-accent)] bg-[rgba(125,211,197,0.18)]"
                                              : "border-white/12 bg-white/[0.02]"
                                        }`}
                                        aria-pressed={isApproved}
                                      >
                                        {isApproved ? (
                                          <CheckCircle2 className="h-3.5 w-3.5 text-teal-100" />
                                        ) : null}
                                      </button>
                                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] ${getPreviewStatusPill(row.status)}`}>
                                        {getPreviewStatusLabel(row.status)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-4 pr-4 font-medium">{row.guestName}</td>
                                  <td className="py-4 pr-4 text-[var(--workspace-muted)]">{row.propertyName}</td>
                                  <td className="py-4 pr-4">{formatCompactDate(row.checkIn)}</td>
                                  <td className="py-4 pr-4">{formatCompactDate(row.checkOut)}</td>
                                  <td className="py-4 pr-4">{row.channel}</td>
                                  <td className="py-4 pr-4">{formatCurrency(row.grossRevenue)}</td>
                                  <td className="py-4 pr-4">{formatCurrency(row.payout)}</td>
                                  <td className={`py-4 ${getMatchTone(row.matchType)}`}>{row.matchLabel}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div
                      ref={reviewRef}
                      className="rounded-[24px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-5"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                        Detail panel
                      </p>
                      <p className="mt-2 text-lg font-medium text-[var(--workspace-text)]">
                        {selectedTableRow ? selectedTableRow.guestName : "Choose a row"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                        {selectedTableRow
                          ? "Review the imported booking, the closest synced event, and why Hostlyx matched or flagged it."
                          : "Select a row from the table to inspect the booking and decide whether to import, skip, or fix it."}
                      </p>

                      {selectedTableRow ? (
                        <div className="mt-5 space-y-4">
                          <div className="rounded-[20px] border border-[var(--workspace-border)] bg-white/[0.03] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted)]">
                              Booking being imported
                            </p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-xs text-[var(--workspace-muted)]">Guest</p>
                                <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">{selectedTableRow.guestName}</p>
                              </div>
                              <div>
                                <p className="text-xs text-[var(--workspace-muted)]">Property</p>
                                <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">{selectedTableRow.propertyName}</p>
                              </div>
                              <div>
                                <p className="text-xs text-[var(--workspace-muted)]">Dates</p>
                                <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">{formatCompactDate(selectedTableRow.checkIn)} to {formatCompactDate(selectedTableRow.checkOut)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-[var(--workspace-muted)]">Gross / payout</p>
                                <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">{formatCurrency(selectedTableRow.grossRevenue)} · {formatCurrency(selectedTableRow.payout)}</p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[20px] border border-[var(--workspace-border)] bg-white/[0.03] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted)]">
                              Closest synced calendar event
                            </p>
                            {selectedTableRow.calendarMatch ? (
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div>
                                  <p className="text-xs text-[var(--workspace-muted)]">Source</p>
                                  <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">{selectedTableRow.calendarMatch.source}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-[var(--workspace-muted)]">Event type</p>
                                  <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">{selectedTableRow.calendarMatch.eventType}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-[var(--workspace-muted)]">Start date</p>
                                  <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">{formatCompactDate(selectedTableRow.calendarMatch.startDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-[var(--workspace-muted)]">End date</p>
                                  <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">{formatCompactDate(selectedTableRow.calendarMatch.endDate)}</p>
                                </div>
                                <div className="sm:col-span-2">
                                  <p className="text-xs text-[var(--workspace-muted)]">Summary</p>
                                  <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">{selectedTableRow.calendarMatch.summary || "No summary"}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-[18px] border border-[var(--workspace-border)] bg-white/[0.02] px-4 py-4 text-sm text-[var(--workspace-muted)]">
                                No synced calendar event was close enough to link this booking.
                              </div>
                            )}
                          </div>

                          <div className="rounded-[20px] border border-[var(--workspace-border)] bg-white/[0.03] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted)]">
                              Match result
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] ${getPreviewStatusPill(selectedTableRow.status)}`}>
                                {getPreviewStatusLabel(selectedTableRow.status)}
                              </span>
                              <p className={`text-sm font-medium ${getMatchTone(selectedTableRow.matchType)}`}>
                                {selectedTableRow.matchLabel}
                              </p>
                            </div>
                            <div className="mt-4 rounded-[14px] border border-white/8 bg-white/[0.02] px-3 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted)]">
                                Decision
                              </p>
                              <div className="mt-2 flex items-center gap-3">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] ${
                                    selectedTableRow.decisionStatus === "auto-approved"
                                      ? "border-teal-300/24 bg-teal-300/[0.08] text-teal-100"
                                      : selectedTableRow.decisionStatus === "blocked"
                                        ? "border-rose-300/24 bg-rose-300/[0.08] text-rose-100"
                                        : "border-amber-300/24 bg-amber-300/[0.08] text-amber-100"
                                  }`}
                                >
                                  {selectedTableRow.decisionStatus === "auto-approved"
                                    ? "Auto-approved"
                                    : selectedTableRow.decisionStatus === "blocked"
                                      ? "Blocked"
                                      : "Needs review"}
                                </span>
                                <p className="text-sm text-[var(--workspace-text)]">
                                  {selectedTableRow.decisionReason}
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 space-y-2">
                              {selectedTableRow.reasons.length > 0 ? (
                                selectedTableRow.reasons.map((reason) => (
                                  <div
                                    key={`${selectedTableRow.id}-${reason}`}
                                    className="rounded-[14px] border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-[var(--workspace-text)]"
                                  >
                                    {reason}
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-[14px] border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-[var(--workspace-muted)]">
                                  No matching signals were found.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-[20px] border border-[var(--workspace-border)] bg-white/[0.03] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted)]">
                              Actions
                            </p>
                            <div className="mt-4 flex flex-col gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedTableRow.isDisabled) {
                                    return;
                                  }

                                  toggleRowApproval(selectedTableRow.id);
                                  scrollToImportAction();
                                }}
                                disabled={selectedTableRow.isDisabled}
                                className="workspace-button-primary inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {selectedTableRow.isDisabled
                                  ? "Blocked"
                                  : approvedRowIds.includes(selectedTableRow.id)
                                    ? "Approved for import"
                                    : "Approve booking"}
                              </button>
                              {selectedTableRow.decisionStatus === "needs-review" ? (
                                <button
                                  type="button"
                                  onClick={openSelectedRowFix}
                                  className="workspace-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition"
                                >
                                  Fix row
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void skipBookingRow(selectedTableRow.rowIndex)}
                                className="workspace-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition"
                              >
                                Skip row
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedTableRowId(null)}
                                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-[var(--workspace-muted)] transition hover:bg-white/[0.06]"
                              >
                                Review later
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div
                    ref={readyToContinueRef}
                    className="rounded-[24px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-5"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
                        <div className="rounded-full border border-teal-300/18 bg-teal-300/[0.08] px-3 py-2 text-sm text-teal-100">
                          {preview.tableRows.filter((row) => row.decisionStatus === "auto-approved").length} auto-approved
                        </div>
                        <div className="rounded-full border border-amber-300/18 bg-amber-300/[0.08] px-3 py-2 text-sm text-amber-100">
                          {preview.tableRows.filter((row) => row.decisionStatus === "needs-review").length} need review
                        </div>
                        <div className="rounded-full border border-rose-300/18 bg-rose-300/[0.08] px-3 py-2 text-sm text-rose-100">
                          {preview.tableRows.filter((row) => row.decisionStatus === "blocked").length} blocked
                        </div>
                      </div>

                      <p className="text-sm text-[var(--workspace-muted)]">
                        {actionableRows} rows ready to import
                      </p>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          ref={importButtonRef}
                          type="button"
                          onClick={handleImport}
                          disabled={actionableRows <= 0 || phase === "importing" || phase === "previewing"}
                          className="workspace-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[220px]"
                        >
                          {phase === "importing" ? (
                            <>
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              Import approved rows
                            </>
                          ) : (
                            "Import approved rows"
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

      <Modal
        open={Boolean(bookingFixDraft)}
        title={bookingFixDraft ? `Fix row ${bookingFixDraft.rowIndex}` : "Fix row"}
        onClose={() => setBookingFixDraft(null)}
      >
        {bookingFixDraft ? (
          <div className="space-y-5">
            <div className="rounded-[22px] border border-[var(--workspace-border)] bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-[var(--workspace-text)]">{bookingFixDraft.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
                Edit the fields that look wrong, then re-check this row. If the row is not a real booking, skip it.
              </p>
              {bookingFixDraft.reasons.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {bookingFixDraft.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full border border-amber-400/18 bg-amber-300/[0.08] px-3 py-1.5 text-xs text-amber-100"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {([
                ["guestName", "Guest name", "text"],
                ["channel", "Channel", "text"],
                ["checkIn", "Check-in", "date"],
                ["checkOut", "Check-out", "date"],
                ["bookingReference", "Booking reference", "text"],
                ["propertyName", "Property", "text"],
                ["guests", "Guests", "number"],
                ["grossRevenue", "Gross revenue", "number"],
                ["platformFee", "Platform fee", "number"],
                ["taxAmount", "Taxes", "number"],
                ["cleaningFee", "Cleaning fee", "number"],
                ["payout", "Payout", "number"],
              ] as Array<[keyof ImportEditableBooking, string, "text" | "date" | "number"]>).map(
                ([field, label, type]) => (
                  <label key={field} className="space-y-2">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                      {label}
                    </span>
                    <input
                      type={type}
                      step={type === "number" ? "0.01" : undefined}
                      min={field === "guests" ? "0" : undefined}
                      value={
                        type === "number"
                          ? String(bookingFixDraft.booking[field] ?? 0)
                          : String(bookingFixDraft.booking[field] ?? "")
                      }
                      onChange={(event) => updateBookingFixField(field, event.target.value)}
                      className="w-full rounded-[18px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] px-4 py-3 text-sm text-[var(--workspace-text)] outline-none transition focus:border-[var(--workspace-accent)]"
                    />
                  </label>
                ),
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => void skipBookingRow(bookingFixDraft.rowIndex)}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[var(--workspace-muted)] transition hover:bg-white/[0.06]"
              >
                Skip this row
              </button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setBookingFixDraft(null)}
                  className="workspace-button-secondary inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveBookingFix()}
                  className="workspace-button-primary inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition"
                >
                  Re-check this row
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
