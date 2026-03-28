import { getCell, rowIsEmpty, toRawRow } from "./columnMatchers";
import { calculateNights, parseImportDateDetailed } from "./dates";
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

  sheet.rows
    .slice(mapping.headerRowIndex + 1)
    .filter((row) => !rowIsEmpty(row))
    .forEach((row, index) => {
      const rowIndex = mapping.headerRowIndex + index + 2;
      const checkInMeta = parseImportDateDetailed(getCell(row, mapping.checkIn ?? undefined));
      const checkOutMeta = parseImportDateDetailed(getCell(row, mapping.checkOut ?? undefined));
      const grossMoney = parseMoney(getCell(row, mapping.grossRevenue ?? undefined));
      const payoutMoney =
        mapping.payout != null
          ? parseMoney(getCell(row, mapping.payout))
          : { value: grossMoney.value, malformed: false, currency: grossMoney.currency };

      const booking: NormalizedImportBooking = {
        source: "unknown",
        propertyName: String(getCell(row, mapping.propertyName ?? undefined) ?? "").trim(),
        bookingReference: "",
        guestName: String(getCell(row, mapping.guestName ?? undefined) ?? "").trim(),
        channel: "Imported file",
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
    source: "unknown",
    bookings,
    expenses: [],
    warnings,
    duplicates: [],
    skippedRows: 0,
    totalRowsRead: sheet.rows.slice(mapping.headerRowIndex + 1).filter((row) => !rowIsEmpty(row)).length,
  };
}
