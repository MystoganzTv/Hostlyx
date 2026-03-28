import {
  bookingComBookingColumns,
  getCell,
  mapOptionalColumns,
  rowIsEmpty,
  toRawRow,
} from "./columnMatchers";
import {
  calculateNights,
  deriveCheckOut,
  inferDatePreferenceFromSheet,
  parseImportDateDetailed,
  parseNights,
} from "./dates";
import { inferCurrency, parseMoney } from "./money";
import { validateBookingRow } from "./validators";
import type {
  ImportBookingCandidate,
  ImportNormalizationResult,
  ImportValidationWarning,
  NormalizedImportBooking,
  ParsedImportWorkbook,
} from "./types";

type BookingComColumnKey = keyof typeof bookingComBookingColumns;

export function normalizeBooking(workbook: ParsedImportWorkbook): ImportNormalizationResult {
  let selectedSheet = workbook.sheets[0];
  let selectedHeaderRowIndex = -1;
  let selectedIndexes: Partial<Record<BookingComColumnKey, number>> | null = null;

  for (const sheet of workbook.sheets) {
    for (let rowIndex = 0; rowIndex < Math.min(sheet.rows.length, 10); rowIndex += 1) {
      const row = sheet.rows[rowIndex];
      const indexes = mapOptionalColumns(row, bookingComBookingColumns);

      if (
        typeof indexes.checkIn === "number" &&
        typeof indexes.checkOut === "number" &&
        (typeof indexes.bookingReference === "number" || typeof indexes.guestName === "number") &&
        (typeof indexes.payout === "number" ||
          typeof indexes.grossRevenue === "number" ||
          typeof indexes.platformFee === "number")
      ) {
        selectedSheet = sheet;
        selectedHeaderRowIndex = rowIndex;
        selectedIndexes = indexes;
        break;
      }
    }

    if (selectedHeaderRowIndex >= 0) {
      break;
    }
  }

  if (selectedHeaderRowIndex < 0 || !selectedIndexes) {
    throw new Error("Hostlyx could not find recognizable Booking.com columns in this file.");
  }

  const headers = selectedSheet.rows[selectedHeaderRowIndex];
  const datePreference = inferDatePreferenceFromSheet(
    headers,
    selectedSheet.rows.slice(selectedHeaderRowIndex + 1).filter((row) => !rowIsEmpty(row)),
    [selectedIndexes.checkIn, selectedIndexes.checkOut],
  );
  const warnings: ImportValidationWarning[] = [];
  const bookings: ImportBookingCandidate[] = [];

  selectedSheet.rows
    .slice(selectedHeaderRowIndex + 1)
    .filter((row) => !rowIsEmpty(row))
    .forEach((row, index) => {
      const rowIndex = selectedHeaderRowIndex + index + 2;
      const grossMoney = parseMoney(getCell(row, selectedIndexes.grossRevenue));
      const payoutMoney = parseMoney(getCell(row, selectedIndexes.payout));
      const feeMoney = parseMoney(getCell(row, selectedIndexes.platformFee));
      const cleaningMoney = parseMoney(getCell(row, selectedIndexes.cleaningFee));
      const explicitNights = parseNights(getCell(row, selectedIndexes.nights));
      const checkInMeta = parseImportDateDetailed(getCell(row, selectedIndexes.checkIn), {
        datePreference,
      });
      let checkOutMeta = parseImportDateDetailed(getCell(row, selectedIndexes.checkOut), {
        datePreference,
      });

      if (!checkOutMeta.value && checkInMeta.value && explicitNights > 0) {
        checkOutMeta = {
          value: deriveCheckOut(checkInMeta.value, explicitNights),
          ambiguous: false,
          malformed: false,
        };
      }

      const grossRevenue = grossMoney.value > 0 ? grossMoney.value : Math.max(0, payoutMoney.value);
      const platformFee = Math.max(0, Math.abs(feeMoney.value));
      const payout =
        payoutMoney.value > 0
          ? payoutMoney.value
          : Math.max(0, grossRevenue - platformFee);
      const nights = explicitNights || calculateNights(checkInMeta.value, checkOutMeta.value);

      const booking: NormalizedImportBooking = {
        source: "booking",
        propertyName: String(getCell(row, selectedIndexes.propertyName) ?? "").trim(),
        bookingReference: String(getCell(row, selectedIndexes.bookingReference) ?? "").trim(),
        guestName: String(getCell(row, selectedIndexes.guestName) ?? "").trim(),
        channel: "Booking.com",
        checkIn: checkInMeta.value,
        checkOut: checkOutMeta.value,
        nights,
        guests: Number(String(getCell(row, selectedIndexes.guests) ?? "").replace(/[^\d]/g, "")) || 0,
        grossRevenue,
        platformFee,
        cleaningFee: Math.max(0, cleaningMoney.value),
        payout,
        currency: inferCurrency(
          String(getCell(row, selectedIndexes.currency) ?? "").trim(),
          grossMoney.currency,
          payoutMoney.currency,
          feeMoney.currency,
          cleaningMoney.currency,
        ),
        status: String(getCell(row, selectedIndexes.status) ?? "").trim() || "Booked",
        rawRow: toRawRow(headers, row),
      };

      const rowWarnings = validateBookingRow({
        booking,
        rowIndex,
        malformedRequiredMoneyFields: [
          grossMoney.malformed ? "gross revenue" : "",
          payoutMoney.malformed && typeof selectedIndexes.payout === "number" ? "payout" : "",
        ].filter(Boolean),
        malformedOptionalMoneyFields: [
          feeMoney.malformed ? "platform fee" : "",
          cleaningMoney.malformed ? "cleaning fee" : "",
        ].filter(Boolean),
        ambiguousDateFields: [
          checkInMeta.ambiguous ? "check-in" : "",
          checkOutMeta.ambiguous ? "check-out" : "",
        ].filter(Boolean),
        malformedDateFields: [
          checkInMeta.malformed ? "check-in" : "",
          checkOutMeta.malformed ? "check-out" : "",
        ].filter(Boolean),
      });

      warnings.push(...rowWarnings);
      bookings.push({
        rowIndex,
        booking,
        warnings: rowWarnings,
      });
    });

  return {
    source: "booking",
    bookings,
    expenses: [],
    warnings,
    duplicates: [],
    skippedRows: 0,
    totalRowsRead: selectedSheet.rows
      .slice(selectedHeaderRowIndex + 1)
      .filter((row) => !rowIsEmpty(row)).length,
  };
}
