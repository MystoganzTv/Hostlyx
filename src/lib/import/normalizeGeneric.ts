import { normalizeExpenseFields } from "@/lib/expense-normalization";
import {
  findHeaderRowIndex,
  genericBookingColumns,
  genericExpenseColumns,
  getCell,
  mapOptionalColumns,
  mapRequiredColumns,
  rowIsEmpty,
  toRawRow,
} from "./columnMatchers";
import {
  calculateNights,
  inferDatePreferenceFromSheet,
  parseImportDateDetailed,
  parseNights,
} from "./dates";
import { inferCurrency, parseMoney } from "./money";
import { validateBookingRow, validateExpenseRow } from "./validators";
import type {
  ImportBookingCandidate,
  ImportExpenseCandidate,
  ImportNormalizationResult,
  ImportValidationWarning,
  NormalizedImportBooking,
  NormalizedImportExpense,
  ParsedImportWorkbook,
} from "./types";

export function normalizeGeneric(workbook: ParsedImportWorkbook): ImportNormalizationResult {
  const bookingsSheet = workbook.sheets.find((sheet) => sheet.normalizedName === "bookings");
  const expensesSheet = workbook.sheets.find((sheet) => sheet.normalizedName === "expenses");

  if (!bookingsSheet || !expensesSheet) {
    throw new Error("Generic imports require both Bookings and Expenses sheets.");
  }

  const bookingHeaderRowIndex = findHeaderRowIndex(bookingsSheet.rows, genericBookingColumns);
  const expenseHeaderRowIndex = findHeaderRowIndex(expensesSheet.rows, genericExpenseColumns);

  if (bookingHeaderRowIndex < 0) {
    throw new Error("Hostlyx could not find the Bookings header row.");
  }

  if (expenseHeaderRowIndex < 0) {
    throw new Error("Hostlyx could not find the Expenses header row.");
  }

  const bookingHeaders = bookingsSheet.rows[bookingHeaderRowIndex];
  const expenseHeaders = expensesSheet.rows[expenseHeaderRowIndex];
  const bookingIndexes = mapRequiredColumns(bookingHeaders, {
    checkIn: genericBookingColumns.checkIn,
    checkOut: genericBookingColumns.checkOut,
    guestName: genericBookingColumns.guestName,
    totalRevenue: genericBookingColumns.totalRevenue,
    payout: genericBookingColumns.payout,
  });
  const bookingOptional = mapOptionalColumns(bookingHeaders, genericBookingColumns);
  const expenseIndexes = mapRequiredColumns(expenseHeaders, {
    date: genericExpenseColumns.date,
    category: genericExpenseColumns.category,
    amount: genericExpenseColumns.amount,
    description: genericExpenseColumns.description,
    note: genericExpenseColumns.note,
  });
  const expenseOptional = mapOptionalColumns(expenseHeaders, genericExpenseColumns);
  const bookingDatePreference = inferDatePreferenceFromSheet(
    bookingHeaders,
    bookingsSheet.rows.slice(bookingHeaderRowIndex + 1).filter((row) => !rowIsEmpty(row)),
    [bookingIndexes.checkIn, bookingIndexes.checkOut],
  );
  const expenseDatePreference = inferDatePreferenceFromSheet(
    expenseHeaders,
    expensesSheet.rows.slice(expenseHeaderRowIndex + 1).filter((row) => !rowIsEmpty(row)),
    [expenseIndexes.date],
  );

  const warnings: ImportValidationWarning[] = [];
  const bookings: ImportBookingCandidate[] = [];
  const expenses: ImportExpenseCandidate[] = [];

  bookingsSheet.rows
    .slice(bookingHeaderRowIndex + 1)
    .filter((row) => !rowIsEmpty(row))
    .forEach((row, index) => {
      const rowIndex = bookingHeaderRowIndex + index + 2;
      const grossMoney = parseMoney(getCell(row, bookingOptional.totalRevenue));
      const payoutMoney = parseMoney(getCell(row, bookingOptional.payout));
      const feeMoney = parseMoney(getCell(row, bookingOptional.hostFee));
      const cleaningMoney = parseMoney(getCell(row, bookingOptional.cleaningFee));
      const checkInMeta = parseImportDateDetailed(getCell(row, bookingIndexes.checkIn), {
        datePreference: bookingDatePreference,
      });
      const checkOutMeta = parseImportDateDetailed(getCell(row, bookingIndexes.checkOut), {
        datePreference: bookingDatePreference,
      });
      const derivedNights =
        parseNights(getCell(row, bookingOptional.rentalPeriod)) ||
        calculateNights(checkInMeta.value, checkOutMeta.value);
      const booking: NormalizedImportBooking = {
        source: "generic",
        propertyName: String(getCell(row, bookingOptional.propertyName) ?? "").trim(),
        bookingReference: String(getCell(row, bookingOptional.bookingReference) ?? "").trim(),
        guestName: String(getCell(row, bookingIndexes.guestName) ?? "").trim(),
        channel: String(getCell(row, bookingOptional.channel) ?? "").trim() || "Direct",
        checkIn: checkInMeta.value,
        checkOut: checkOutMeta.value,
        nights: derivedNights,
        guests: Number(String(getCell(row, bookingOptional.guests) ?? "").replace(/[^\d]/g, "")) || 0,
        grossRevenue: grossMoney.value,
        platformFee: feeMoney.value,
        cleaningFee: cleaningMoney.value,
        payout: payoutMoney.value,
        currency: inferCurrency(
          grossMoney.currency,
          payoutMoney.currency,
          feeMoney.currency,
          cleaningMoney.currency,
        ),
        status: String(getCell(row, bookingOptional.status) ?? "").trim() || "Booked",
        rawRow: toRawRow(bookingHeaders, row),
      };

      const rowWarnings = validateBookingRow({
        booking,
        rowIndex,
        malformedRequiredMoneyFields: [
          grossMoney.malformed ? "gross revenue" : "",
          payoutMoney.malformed ? "payout" : "",
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

  expensesSheet.rows
    .slice(expenseHeaderRowIndex + 1)
    .filter((row) => !rowIsEmpty(row))
    .forEach((row, index) => {
      const rowIndex = expenseHeaderRowIndex + index + 2;
      const normalizedExpenseFields = normalizeExpenseFields({
        amountValue: getCell(row, expenseIndexes.amount),
        descriptionValue: getCell(row, expenseIndexes.description),
        noteValue: getCell(row, expenseIndexes.note),
      });
      const expenseDateMeta = parseImportDateDetailed(getCell(row, expenseIndexes.date), {
        datePreference: expenseDatePreference,
      });
      const amountMeta = parseMoney(getCell(row, expenseIndexes.amount));
      const expense: NormalizedImportExpense = {
        source: "generic",
        propertyName: String(getCell(row, expenseOptional.propertyName) ?? "").trim(),
        date: expenseDateMeta.value,
        category: String(getCell(row, expenseIndexes.category) ?? "").trim() || "Other",
        description: normalizedExpenseFields.description,
        note: normalizedExpenseFields.note,
        amount: amountMeta.malformed ? normalizedExpenseFields.amount : amountMeta.value,
        rawRow: toRawRow(expenseHeaders, row),
      };

      const rowWarnings = validateExpenseRow({
        expense,
        rowIndex,
        malformedAmount: amountMeta.malformed,
        malformedDate: expenseDateMeta.malformed,
      });
      warnings.push(...rowWarnings);
      expenses.push({
        rowIndex,
        expense,
        warnings: rowWarnings,
      });
    });

  return {
    source: "generic",
    bookings,
    expenses,
    warnings,
    duplicates: [],
    skippedRows: 0,
    totalRowsRead:
      bookingsSheet.rows.slice(bookingHeaderRowIndex + 1).filter((row) => !rowIsEmpty(row)).length +
      expensesSheet.rows.slice(expenseHeaderRowIndex + 1).filter((row) => !rowIsEmpty(row)).length,
  };
}
