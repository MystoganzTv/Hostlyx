import type { BookingRecord, ExpenseRecord, ImportedFileSource } from "@/lib/types";
import { detectDuplicateBookings } from "./dedupe";
import { detectSource } from "./detectSource";
import { normalizeAirbnb } from "./normalizeAirbnb";
import { normalizeBooking } from "./normalizeBooking";
import { normalizeGeneric } from "./normalizeGeneric";
import { normalizeManual } from "./normalizeManual";
import { parseWorkbook } from "./parseWorkbook";
import {
  getDetectedSourceLabel,
  type ImportBookingCandidate,
  type ImportDetectedSource,
  type ImportExpenseCandidate,
  type ImportManualMapping,
  type ImportManualMappingField,
  type ImportPreview,
  type ImportReviewRow,
  type ImportReviewSection,
  type ImportValidationWarning,
} from "./types";
import { normalizeHeader, rowIsEmpty } from "./columnMatchers";

function hasBlockingIssues(warnings: ImportValidationWarning[]) {
  return warnings.some((warning) => warning.severity === "error");
}

function describeBookingCandidate(
  row: ImportBookingCandidate,
  section: ImportReviewSection,
): ImportReviewRow {
  return {
    id: `booking-${row.rowIndex}`,
    rowType: "booking",
    rowIndex: row.rowIndex,
    section,
    title: row.booking.guestName || row.booking.bookingReference || "Booking row",
    subtitle: `${row.booking.channel} • ${row.booking.checkIn || "—"} to ${row.booking.checkOut || "—"}`,
    reasons:
      section === "duplicates" && row.duplicate
        ? [row.duplicate.message, ...row.warnings.map((warning) => warning.message)]
        : row.warnings.map((warning) => warning.message),
  };
}

function describeExpenseCandidate(
  row: ImportExpenseCandidate,
  section: ImportReviewSection,
): ImportReviewRow {
  return {
    id: `expense-${row.rowIndex}`,
    rowType: "expense",
    rowIndex: row.rowIndex,
    section,
    title: row.expense.category || "Expense row",
    subtitle: `${row.expense.date || "—"} • ${row.expense.description || row.expense.note || "Expense"}`,
    reasons: row.warnings.map((warning) => warning.message),
  };
}

function categorizeBookingCandidate(candidate: ImportBookingCandidate): ImportReviewSection {
  if (hasBlockingIssues(candidate.warnings)) {
    return "errors";
  }

  if (candidate.duplicate) {
    return "duplicates";
  }

  if (candidate.warnings.length > 0) {
    return "warnings";
  }

  return "valid";
}

function categorizeExpenseCandidate(candidate: ImportExpenseCandidate): ImportReviewSection {
  if (hasBlockingIssues(candidate.warnings)) {
    return "errors";
  }

  if (candidate.warnings.length > 0) {
    return "warnings";
  }

  return "valid";
}

function getLikelyHeaderRow(workbook: ReturnType<typeof parseWorkbook>) {
  let best:
    | {
        sheetName: string;
        headerRowIndex: number;
        headers: string[];
        score: number;
      }
    | undefined;

  for (const sheet of workbook.sheets) {
    for (let rowIndex = 0; rowIndex < Math.min(sheet.rows.length, 8); rowIndex += 1) {
      const row = sheet.rows[rowIndex];
      if (rowIsEmpty(row)) {
        continue;
      }

      const headers = row.map((cell) => String(cell ?? "").trim());
      const score = headers.filter(Boolean).length;
      if (!best || score > best.score) {
        best = {
          sheetName: sheet.name,
          headerRowIndex: rowIndex,
          headers,
          score,
        };
      }
    }
  }

  return best;
}

function suggestMappedColumn(headers: string[], field: ImportManualMappingField) {
  const aliases: Record<ImportManualMappingField, string[]> = {
    guestName: ["guest", "name", "booker", "customer"],
    checkIn: ["arrival", "checkin", "start", "from"],
    checkOut: ["departure", "checkout", "end", "to"],
    grossRevenue: ["revenue", "amount", "gross", "price", "total"],
    payout: ["payout", "net", "earnings", "received"],
    propertyName: ["property", "listing", "accommodation", "unit", "home"],
  };

  const normalizedHeaders = headers.map((header) => normalizeHeader(header));
  const fieldAliases = aliases[field].map((alias) => normalizeHeader(alias));
  let bestIndex: number | null = null;
  let bestScore = 0;

  normalizedHeaders.forEach((header, index) => {
    if (!header) {
      return;
    }

    for (const alias of fieldAliases) {
      let score = 0;

      if (header === alias) {
        score = 4;
      } else if (header.includes(alias) || alias.includes(header)) {
        score = 3;
      } else {
        const tokens = alias.split(/[^a-z0-9]/).filter(Boolean);
        if (tokens.some((token) => header.includes(token))) {
          score = 2;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
  });

  return bestIndex;
}

function buildManualMappingPreview(
  workbook: ReturnType<typeof parseWorkbook>,
  manualMapping?: ImportManualMapping | null,
) {
  const headerRow = getLikelyHeaderRow(workbook);
  if (!headerRow) {
    return null;
  }

  const suggested = {
    guestName: suggestMappedColumn(headerRow.headers, "guestName"),
    checkIn: suggestMappedColumn(headerRow.headers, "checkIn"),
    checkOut: suggestMappedColumn(headerRow.headers, "checkOut"),
    grossRevenue: suggestMappedColumn(headerRow.headers, "grossRevenue"),
    payout: suggestMappedColumn(headerRow.headers, "payout"),
    propertyName: suggestMappedColumn(headerRow.headers, "propertyName"),
  };

  const selected = {
    guestName:
      manualMapping?.sheetName === headerRow.sheetName &&
      manualMapping.headerRowIndex === headerRow.headerRowIndex
        ? manualMapping.guestName
        : suggested.guestName,
    checkIn:
      manualMapping?.sheetName === headerRow.sheetName &&
      manualMapping.headerRowIndex === headerRow.headerRowIndex
        ? manualMapping.checkIn
        : suggested.checkIn,
    checkOut:
      manualMapping?.sheetName === headerRow.sheetName &&
      manualMapping.headerRowIndex === headerRow.headerRowIndex
        ? manualMapping.checkOut
        : suggested.checkOut,
    grossRevenue:
      manualMapping?.sheetName === headerRow.sheetName &&
      manualMapping.headerRowIndex === headerRow.headerRowIndex
        ? manualMapping.grossRevenue
        : suggested.grossRevenue,
    payout:
      manualMapping?.sheetName === headerRow.sheetName &&
      manualMapping.headerRowIndex === headerRow.headerRowIndex
        ? manualMapping.payout
        : suggested.payout,
    propertyName:
      manualMapping?.sheetName === headerRow.sheetName &&
      manualMapping.headerRowIndex === headerRow.headerRowIndex
        ? manualMapping.propertyName
        : suggested.propertyName,
  };

  return {
    message: "We couldn’t fully recognize your file. Map your columns in a few seconds to continue.",
    sheetName: headerRow.sheetName,
    headerRowIndex: headerRow.headerRowIndex,
    columns: headerRow.headers.map((label, index) => ({
      index,
      label: label || `Column ${index + 1}`,
    })),
    suggested,
    selected,
    requiredReady:
      selected.guestName != null &&
      selected.checkIn != null &&
      selected.checkOut != null &&
      selected.grossRevenue != null,
  };
}

export function buildImportPreview(
  buffer: ArrayBuffer,
  fileName: string,
  existingBookings: BookingRecord[] = [],
  options?: {
    manualMapping?: ImportManualMapping | null;
  },
): ImportPreview {
  const workbook = parseWorkbook(buffer, fileName);
  let source = detectSource(workbook);
  const manualMapping = buildManualMappingPreview(workbook, options?.manualMapping);

  if (source === "unknown" && !manualMapping?.requiredReady) {
    return {
      source,
      sourceLabel: getDetectedSourceLabel(source),
      fileName,
      requiresManualMapping: true,
      manualMapping,
      totalRowsRead: workbook.sheets.reduce((sum, sheet) => sum + Math.max(0, sheet.rows.length - 1), 0),
      validRows: 0,
      warningRows: 0,
      duplicateRows: 0,
      errorRows: 0,
      skippedRows: 0,
      expensesDetected: 0,
      importableRows: 0,
      bookings: [],
      expenses: [],
      previewRows: [],
      reviewRows: {
        valid: [],
        warnings: [],
        duplicates: [],
        errors: [],
      },
      warnings: [
        {
          rowType: "file",
          rowIndex: 0,
          code: "unknown_source",
          message:
            "We couldn’t fully recognize your file. Map your columns in a few seconds to continue.",
          severity: "warning",
        },
      ],
      duplicates: [],
      canImport: false,
    };
  }

  let normalized;

  try {
    normalized =
      source === "airbnb"
        ? normalizeAirbnb(workbook)
        : source === "booking"
          ? normalizeBooking(workbook)
          : source === "generic"
            ? normalizeGeneric(workbook)
            : normalizeManual(workbook, {
                sheetName: manualMapping?.sheetName ?? workbook.sheets[0]?.name ?? "",
                headerRowIndex: manualMapping?.headerRowIndex ?? 0,
                guestName: manualMapping?.selected.guestName ?? null,
                checkIn: manualMapping?.selected.checkIn ?? null,
                checkOut: manualMapping?.selected.checkOut ?? null,
                grossRevenue: manualMapping?.selected.grossRevenue ?? null,
                payout: manualMapping?.selected.payout ?? null,
                propertyName: manualMapping?.selected.propertyName ?? null,
              });
  } catch (error) {
    const normalizationAttempts: Array<{
      source: ImportDetectedSource;
      run: () => ReturnType<typeof normalizeAirbnb>;
    }> = [
      { source: "airbnb", run: () => normalizeAirbnb(workbook) },
      { source: "booking", run: () => normalizeBooking(workbook) },
    ];

    for (const attempt of normalizationAttempts) {
      if (attempt.source === source) {
        continue;
      }

      try {
        normalized = attempt.run();
        source = attempt.source;
        break;
      } catch {
        continue;
      }
    }

    if (!normalized) {
      throw error;
    }
  }

  const duplicateFlags = detectDuplicateBookings(normalized.bookings, existingBookings);
  const duplicatesByRowIndex = new Map(duplicateFlags.map((duplicate) => [duplicate.rowIndex, duplicate]));
  const bookingRows = normalized.bookings.map((candidate) => ({
    ...candidate,
    duplicate: duplicatesByRowIndex.get(candidate.rowIndex),
  }));

  const reviewRows: Record<ImportReviewSection, ImportReviewRow[]> = {
    valid: [],
    warnings: [],
    duplicates: [],
    errors: [],
  };

  for (const row of bookingRows) {
    const section = categorizeBookingCandidate(row);
    reviewRows[section].push(describeBookingCandidate(row, section));
  }

  for (const row of normalized.expenses) {
    const section = categorizeExpenseCandidate(row);
    reviewRows[section].push(describeExpenseCandidate(row, section));
  }

  const validRows = reviewRows.valid.length;
  const warningRows = reviewRows.warnings.length;
  const duplicateRows = reviewRows.duplicates.length;
  const errorRows = reviewRows.errors.length;
  const importableRows = validRows + warningRows + duplicateRows;

  return {
    source,
    sourceLabel: source === "unknown" ? "Mapped file" : getDetectedSourceLabel(source),
    fileName,
    requiresManualMapping: source === "unknown",
    manualMapping,
    totalRowsRead: normalized.totalRowsRead,
    validRows,
    warningRows,
    duplicateRows,
    errorRows,
    skippedRows: normalized.skippedRows,
    expensesDetected: normalized.expenses.length,
    importableRows,
    bookings: bookingRows,
    expenses: normalized.expenses,
    previewRows: bookingRows
      .filter((row) => !hasBlockingIssues(row.warnings))
      .slice(0, 5)
      .map((row) => ({
        guestName: row.booking.guestName,
        channel: row.booking.channel,
        checkIn: row.booking.checkIn,
        checkOut: row.booking.checkOut,
        grossRevenue: row.booking.grossRevenue,
        payout: row.booking.payout,
      })),
    reviewRows,
    warnings: normalized.warnings,
    duplicates: duplicateFlags,
    canImport: importableRows > 0,
  };
}

export function mapDetectedSourceToStoredSource(source: ImportDetectedSource): ImportedFileSource {
  switch (source) {
    case "airbnb":
      return "airbnb";
    case "booking":
      return "booking_com";
    default:
      return "generic_excel";
  }
}

export function mapPreviewToHostlyxRecords(
  preview: ImportPreview,
  propertyName: string,
  options?: {
    duplicateStrategy?: "skip" | "import";
  },
): {
  importedSource: ImportedFileSource;
  bookings: BookingRecord[];
  expenses: ExpenseRecord[];
} {
  const duplicateStrategy = options?.duplicateStrategy ?? "skip";

  return {
    importedSource: mapDetectedSourceToStoredSource(preview.source),
    bookings: preview.bookings
      .filter((row) => !hasBlockingIssues(row.warnings))
      .filter((row) => duplicateStrategy === "import" || !row.duplicate)
      .map(({ booking }) => ({
        propertyName,
        unitName: booking.propertyName,
        importedSource: mapDetectedSourceToStoredSource(preview.source),
        checkIn: booking.checkIn,
        checkout: booking.checkOut,
        guestName: booking.guestName || "Guest",
        guestCount: booking.guests,
        channel: booking.channel,
        rentalPeriod: `${booking.nights} nights`,
        pricePerNight: booking.nights > 0 ? booking.grossRevenue / booking.nights : booking.grossRevenue,
        extraFee: 0,
        discount: 0,
        rentalRevenue: booking.grossRevenue,
        cleaningFee: booking.cleaningFee,
        totalRevenue: booking.grossRevenue,
        hostFee: booking.platformFee,
        payout: booking.payout,
        nights: booking.nights,
        bookingNumber: booking.bookingReference,
        overbookingStatus: booking.status,
      })),
    expenses: preview.expenses
      .filter((row) => !hasBlockingIssues(row.warnings))
      .map(({ expense }) => ({
        propertyName,
        unitName: expense.propertyName,
        date: expense.date,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        note: expense.note,
      })),
  };
}
