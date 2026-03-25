import { differenceInCalendarDays, formatISO, isValid, parse } from "date-fns";
import * as XLSX from "xlsx";
import type { BookingRecord, ExpenseRecord } from "./types";

type CellValue = string | number | boolean | Date | null | undefined;
type SheetRow = CellValue[];

const bookingColumnMap = {
  checkIn: ["checkin"],
  checkout: ["checkout"],
  guestName: ["guestname"],
  guestCount: ["ofguests", "guests", "guestcount"],
  channel: ["channel"],
  rentalPeriod: ["rentalperiod"],
  pricePerNight: ["pricepernight"],
  extraFee: ["extrafee"],
  discount: ["discount"],
  rentalRevenue: ["rentalrevenue"],
  cleaningFee: ["cleaningfee"],
  totalRevenue: ["totalrevenue"],
  hostFee: ["hostfee"],
  payout: ["payout"],
} as const;

const expenseColumnMap = {
  date: ["date"],
  category: ["category"],
  amount: ["amount"],
  description: ["description"],
  note: ["note"],
} as const;

function normalizeHeader(value: CellValue) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseCurrency(value: CellValue) {
  if (typeof value === "number") {
    return value;
  }

  const raw = String(value ?? "").trim();

  if (!raw) {
    return 0;
  }

  const negative = raw.startsWith("(") && raw.endsWith(")");
  let cleaned = raw.replace(/[^\d,.-]/g, "");

  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    cleaned =
      cleaned.split(",").length - 1 === 1
        ? cleaned.replace(",", ".")
        : cleaned.replace(/,/g, "");
  }

  const amount = Number(cleaned);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return negative ? -amount : amount;
}

function parseCount(value: CellValue) {
  if (typeof value === "number") {
    return Math.max(0, Math.trunc(value));
  }

  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function parseExcelDate(value: CellValue) {
  if (!value && value !== 0) {
    return "";
  }

  if (value instanceof Date && isValid(value)) {
    return formatISO(value, { representation: "date" });
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (parsed) {
      const normalized = new Date(
        Date.UTC(parsed.y, parsed.m - 1, parsed.d ?? 1),
      );
      return formatISO(normalized, { representation: "date" });
    }
  }

  const raw = String(value).trim();

  if (!raw) {
    return "";
  }

  const patterns = ["M/d/yyyy", "MM/dd/yyyy", "M/d/yy", "yyyy-MM-dd", "MMM d, yyyy"];

  for (const pattern of patterns) {
    const parsed = parse(raw, pattern, new Date());
    if (isValid(parsed)) {
      return formatISO(parsed, { representation: "date" });
    }
  }

  const fallback = new Date(raw);
  if (isValid(fallback)) {
    return formatISO(fallback, { representation: "date" });
  }

  return "";
}

function parseRentalPeriodNights(value: CellValue) {
  const raw = String(value ?? "");
  const match = raw.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function normalizeChannel(value: CellValue) {
  const raw = String(value ?? "").trim();
  return raw || "Unassigned";
}

function getSheetRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
}

function getWorksheet(workbook: XLSX.WorkBook, name: string) {
  const match = workbook.SheetNames.find(
    (sheetName) => normalizeHeader(sheetName) === normalizeHeader(name),
  );

  if (!match) {
    throw new Error(`Missing required sheet: ${name}`);
  }

  return workbook.Sheets[match];
}

function mapHeaderIndexes(
  headers: SheetRow,
  columns: Record<string, readonly string[]>,
) {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));

  return Object.fromEntries(
    Object.entries(columns).map(([key, aliases]) => {
      const index = normalizedHeaders.findIndex((header) =>
        aliases.includes(header),
      );

      if (index === -1) {
        throw new Error(`Missing required column: ${key}`);
      }

      return [key, index];
    }),
  ) as Record<keyof typeof columns, number>;
}

function findHeaderRowIndex(
  rows: SheetRow[],
  columns: Record<string, readonly string[]>,
) {
  for (let index = 0; index < Math.min(rows.length, 12); index += 1) {
    try {
      mapHeaderIndexes(rows[index], columns);
      return index;
    } catch {
      continue;
    }
  }

  throw new Error("Could not find the expected header row in the worksheet.");
}

function rowIsEmpty(row: SheetRow) {
  return row.every((cell) => String(cell ?? "").trim() === "");
}

export function parseWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const bookingsSheet = getWorksheet(workbook, "Bookings");
  const expensesSheet = getWorksheet(workbook, "Expenses");

  const bookingRows = getSheetRows(bookingsSheet);
  const expenseRows = getSheetRows(expensesSheet);

  if (!bookingRows.length) {
    throw new Error("The Bookings sheet is empty.");
  }

  if (!expenseRows.length) {
    throw new Error("The Expenses sheet is empty.");
  }

  const bookingHeaderRowIndex = findHeaderRowIndex(bookingRows, bookingColumnMap);
  const expenseHeaderRowIndex = findHeaderRowIndex(expenseRows, expenseColumnMap);
  const bookingIndexes = mapHeaderIndexes(
    bookingRows[bookingHeaderRowIndex],
    bookingColumnMap,
  );
  const expenseIndexes = mapHeaderIndexes(
    expenseRows[expenseHeaderRowIndex],
    expenseColumnMap,
  );

  const bookings: BookingRecord[] = bookingRows
    .slice(bookingHeaderRowIndex + 1)
    .filter((row) => !rowIsEmpty(row))
    .map((row) => {
      const checkIn = parseExcelDate(row[bookingIndexes.checkIn]);
      const checkout = parseExcelDate(row[bookingIndexes.checkout]);
      const rawRentalPeriod = row[bookingIndexes.rentalPeriod];
      const rentalPeriod = String(rawRentalPeriod ?? "").trim();
      const dateDifference =
        checkIn && checkout
          ? differenceInCalendarDays(new Date(checkout), new Date(checkIn))
          : 0;

      const nights = Math.max(
        1,
        dateDifference || parseRentalPeriodNights(rentalPeriod) || 1,
      );

      return {
        checkIn,
        checkout,
        guestName: String(row[bookingIndexes.guestName] ?? "").trim() || "Guest",
        guestCount: parseCount(row[bookingIndexes.guestCount]),
        channel: normalizeChannel(row[bookingIndexes.channel]),
        rentalPeriod:
          rentalPeriod && Number.isNaN(Number(rentalPeriod))
            ? rentalPeriod
            : `${nights} nights`,
        pricePerNight: parseCurrency(row[bookingIndexes.pricePerNight]),
        extraFee: parseCurrency(row[bookingIndexes.extraFee]),
        discount: parseCurrency(row[bookingIndexes.discount]),
        rentalRevenue: parseCurrency(row[bookingIndexes.rentalRevenue]),
        cleaningFee: parseCurrency(row[bookingIndexes.cleaningFee]),
        totalRevenue: parseCurrency(row[bookingIndexes.totalRevenue]),
        hostFee: parseCurrency(row[bookingIndexes.hostFee]),
        payout: parseCurrency(row[bookingIndexes.payout]),
        nights,
      };
    })
    .filter((booking) => booking.checkIn && booking.checkout);

  const expenses: ExpenseRecord[] = expenseRows
    .slice(expenseHeaderRowIndex + 1)
    .filter((row) => !rowIsEmpty(row))
    .map((row) => ({
      date: parseExcelDate(row[expenseIndexes.date]),
      category: String(row[expenseIndexes.category] ?? "").trim() || "Other",
      amount: parseCurrency(row[expenseIndexes.amount]),
      description:
        String(row[expenseIndexes.description] ?? "").trim() ||
        "Expense import entry",
      note: String(row[expenseIndexes.note] ?? "").trim(),
    }))
    .filter((expense) => expense.date);

  if (!bookings.length && !expenses.length) {
    throw new Error("No valid rows were found in the Bookings or Expenses sheets.");
  }

  return {
    bookings,
    expenses,
  };
}
