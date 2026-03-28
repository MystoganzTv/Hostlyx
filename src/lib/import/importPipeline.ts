import type { BookingRecord, ExpenseRecord, ImportedFileSource } from "@/lib/types";
import { detectDuplicateBookings } from "./dedupe";
import { detectSource } from "./detectSource";
import { normalizeAirbnb } from "./normalizeAirbnb";
import { normalizeBooking } from "./normalizeBooking";
import { normalizeGeneric } from "./normalizeGeneric";
import { parseWorkbook } from "./parseWorkbook";
import {
  getDetectedSourceLabel,
  type ImportBookingCandidate,
  type ImportDetectedSource,
  type ImportExpenseCandidate,
  type ImportPreview,
  type ImportReviewRow,
  type ImportReviewSection,
  type ImportValidationWarning,
} from "./types";

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

export function buildImportPreview(
  buffer: ArrayBuffer,
  fileName: string,
  existingBookings: BookingRecord[] = [],
): ImportPreview {
  const workbook = parseWorkbook(buffer, fileName);
  let source = detectSource(workbook);

  if (source === "unknown") {
    return {
      source,
      sourceLabel: getDetectedSourceLabel(source),
      fileName,
      totalRowsRead: workbook.sheets.reduce((sum, sheet) => sum + Math.max(0, sheet.rows.length - 1), 0),
      validRows: 0,
      warningRows: 0,
      duplicateRows: 0,
      errorRows: 1,
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
            "Hostlyx could not recognize this file yet. Use an Airbnb export, a Booking.com export, or the generic Hostlyx workbook with Bookings and Expenses sheets.",
          severity: "error",
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
          : normalizeGeneric(workbook);
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
    sourceLabel: getDetectedSourceLabel(source),
    fileName,
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
