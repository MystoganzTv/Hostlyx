import { getCell, rowIsEmpty, toRawRow } from "./columnMatchers";
import {
  calculateNights,
  inferDatePreferenceFromSheet,
  parseImportDateDetailed,
} from "./dates";
import { inferCurrency, parseMoney } from "./money";
import { validateBookingRow } from "./validators";
import type {
  ImportBookingCandidate,
  ImportManualMapping,
  ImportNormalizationResult,
  ImportValidationWarning,
  NormalizedImportBooking,
  ParsedImportWorkbook,
} from "./types";

export function normalizeManual(
  workbook: ParsedImportWorkbook,
  mapping: ImportManualMapping,
  options?: {
    source?: "airbnb" | "booking" | "generic" | "unknown";
    channel?: string;
  },
): ImportNormalizationResult {
  const sheet = workbook.sheets.find((entry) => entry.name === mapping.sheetName);

  if (!sheet) {
    throw new Error("Hostlyx could not find the selected sheet for manual mapping.");
  }

  const headers = sheet.rows[mapping.headerRowIndex];
  if (!headers) {
    throw new Error("Hostlyx could not find the selected header row for manual mapping.");
  }

  const warnings: ImportValidationWarning[] = [];
  const bookings: ImportBookingCandidate[] = [];
  const dataRows = sheet.rows.slice(mapping.headerRowIndex + 1).filter((row) => !rowIsEmpty(row));
  const datePreference = inferDatePreferenceFromSheet(headers, dataRows, [
    mapping.checkIn ?? undefined,
    mapping.checkOut ?? undefined,
  ]);

  dataRows.forEach((row, index) => {
      const rowIndex = mapping.headerRowIndex + index + 2;
      const checkInMeta = parseImportDateDetailed(getCell(row, mapping.checkIn ?? undefined), {
        datePreference,
      });
      const checkOutMeta = parseImportDateDetailed(getCell(row, mapping.checkOut ?? undefined), {
        datePreference,
      });
      const grossMoney = parseMoney(getCell(row, mapping.grossRevenue ?? undefined));
      const payoutMoney =
        mapping.payout != null
          ? parseMoney(getCell(row, mapping.payout))
          : { value: grossMoney.value, malformed: false, currency: grossMoney.currency };

      const booking: NormalizedImportBooking = {
        source: options?.source ?? "unknown",
        propertyName: String(getCell(row, mapping.propertyName ?? undefined) ?? "").trim(),
        bookingReference: "",
        guestName: String(getCell(row, mapping.guestName ?? undefined) ?? "").trim(),
        channel: options?.channel ?? "Imported file",
        checkIn: checkInMeta.value,
        checkOut: checkOutMeta.value,
        nights: calculateNights(checkInMeta.value, checkOutMeta.value),
        guests: 0,
        grossRevenue: grossMoney.value,
        platformFee:
          grossMoney.value > 0 && payoutMoney.value > 0 && grossMoney.value >= payoutMoney.value
            ? grossMoney.value - payoutMoney.value
            : 0,
        cleaningFee: 0,
        payout: payoutMoney.value,
        currency: inferCurrency(grossMoney.currency, payoutMoney.currency),
        status: "Booked",
        rawRow: toRawRow(headers, row),
      };

      const rowWarnings = validateBookingRow({
        booking,
        rowIndex,
        malformedRequiredMoneyFields: [
          grossMoney.malformed ? "gross revenue" : "",
          mapping.payout != null && payoutMoney.malformed ? "payout" : "",
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
    source: options?.source ?? "unknown",
    bookings,
    expenses: [],
    warnings,
    duplicates: [],
    skippedRows: 0,
    totalRowsRead: dataRows.length,
  };
}
