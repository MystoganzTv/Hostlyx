import {
  addMonths,
  differenceInCalendarDays,
  formatISO,
  isValid,
  parse,
} from "date-fns";
import * as XLSX from "xlsx";
import type {
  BookingRecord,
  CalendarClosureRecord,
  ExpenseRecord,
} from "./types";
import { normalizeExpenseFields } from "./expense-normalization";

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
  bookingNumber: ["bookingnumber"],
  overbookingStatus: ["overbookingstatus"],
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
      const normalized = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d ?? 1));
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

function getOptionalWorksheet(workbook: XLSX.WorkBook, name: string) {
  const match = workbook.SheetNames.find(
    (sheetName) => normalizeHeader(sheetName) === normalizeHeader(name),
  );

  return match ? workbook.Sheets[match] : null;
}

function mapHeaderIndexes(
  headers: SheetRow,
  columns: Record<string, readonly string[]>,
) {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));

  return Object.fromEntries(
    Object.entries(columns).map(([key, aliases]) => {
      const index = normalizedHeaders.findIndex((header) => aliases.includes(header));

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

function parseMonthName(value: CellValue) {
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const raw = String(value ?? "").trim().toLowerCase();
  const index = monthNames.findIndex((month) => month === raw);
  return index >= 0 ? index + 1 : null;
}

function extractDayNumber(value: CellValue) {
  const raw = String(value ?? "").trim();

  if (!/^\d{1,2}$/.test(raw)) {
    return null;
  }

  const day = Number(raw);
  return day >= 1 && day <= 31 ? day : null;
}

function resolveCalendarDate(
  dateRow: SheetRow,
  targetColumnIndex: number,
  currentYear: number,
  currentMonth: number,
) {
  const calendarColumns = [4, 5, 6, 7, 8, 9, 10];
  const targetIndex = calendarColumns.indexOf(targetColumnIndex);

  if (targetIndex < 0) {
    return "";
  }

  const dateCells = calendarColumns.map((columnIndex) => extractDayNumber(dateRow[columnIndex]));

  if (dateCells[targetIndex] === null) {
    return "";
  }

  const firstCurrentMonthIndex = dateCells.findIndex((day) => day === 1);
  let monthOffset = 0;
  let previousDay: number | null = null;

  for (let index = 0; index <= targetIndex; index += 1) {
    const day = dateCells[index];

    if (day === null) {
      continue;
    }

    if (firstCurrentMonthIndex >= 0 && index < firstCurrentMonthIndex) {
      monthOffset = -1;
    } else if (
      previousDay !== null &&
      day < previousDay &&
      !(firstCurrentMonthIndex >= 0 && index === firstCurrentMonthIndex)
    ) {
      monthOffset += 1;
    } else if (firstCurrentMonthIndex >= 0 && index >= firstCurrentMonthIndex && monthOffset < 0) {
      monthOffset = 0;
    }

    previousDay = day;
  }

  const anchor = addMonths(new Date(currentYear, currentMonth - 1, 1), monthOffset);
  return formatISO(
    new Date(anchor.getFullYear(), anchor.getMonth(), dateCells[targetIndex] ?? 1),
    {
      representation: "date",
    },
  );
}

function parseCalendarClosures(rows: SheetRow[]) {
  const closuresByDate = new Map<string, CalendarClosureRecord>();
  let currentYear: number | null = null;
  let currentMonth: number | null = null;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const yearValue = row
      .map((cell) => String(cell ?? "").trim())
      .find((cell) => /^\d{4}$/.test(cell));
    const monthValue = row
      .map((cell) => parseMonthName(cell))
      .find((value) => value !== null);

    if (yearValue && monthValue) {
      currentYear = Number(yearValue);
      currentMonth = monthValue;
    }

    if (!currentYear || !currentMonth) {
      continue;
    }

    for (let columnIndex = 4; columnIndex <= 10; columnIndex += 1) {
      const rawValue = String(row[columnIndex] ?? "").trim();

      if (!rawValue || !/(closed|check-in|check-out)/i.test(rawValue)) {
        continue;
      }

      let dateRowIndex = -1;

      for (let searchIndex = rowIndex - 1; searchIndex >= Math.max(0, rowIndex - 6); searchIndex -= 1) {
        if (extractDayNumber(rows[searchIndex]?.[columnIndex]) !== null) {
          dateRowIndex = searchIndex;
          break;
        }
      }

      if (dateRowIndex < 0) {
        continue;
      }

      const date = resolveCalendarDate(
        rows[dateRowIndex],
        columnIndex,
        currentYear,
        currentMonth,
      );

      if (!date) {
        continue;
      }

      const noteLines = new Set<string>();
      for (let detailIndex = dateRowIndex + 1; detailIndex <= Math.min(rows.length - 1, rowIndex + 1); detailIndex += 1) {
        const detailValue = String(rows[detailIndex]?.[columnIndex] ?? "").trim();
        if (detailValue) {
          noteLines.add(detailValue);
        }
      }

      const note = Array.from(noteLines).join("\n");
      const guestLine = note
        .split("\n")
        .find((line) => /guests?\s*:/i.test(line));
      const nightsLine = note
        .split("\n")
        .find((line) => /nights?\s*:/i.test(line));
      const statusLine = note
        .split("\n")
        .find((line) => /^(check-in|check-out|closed|booked)\s*:?/i.test(line));
      const parsedGuestCount = guestLine
        ? parseCount(guestLine.replace(/guests?\s*:/i, ""))
        : 0;
      const parsedNights = nightsLine
        ? parseCount(nightsLine.replace(/nights?\s*:/i, ""))
        : 0;
      const statusLabel =
        statusLine
          ?.split(":")[0]
          .trim()
          .replace(/\s+/g, " ")
          .replace(/\b\w/g, (match) => match.toUpperCase()) ?? "Closed";
      const reason =
        note
          .split("\n")
          .map((line) =>
            line
              .replace(/check-in:\s*/i, "")
              .replace(/check-out:\s*/i, "")
              .replace(/closed:\s*/i, "")
              .trim(),
          )
          .find(
            (line) =>
              line &&
              !/closed/i.test(line) &&
              !/check-in/i.test(line) &&
              !/check-out/i.test(line) &&
              !/booked/i.test(line) &&
              !/guests:/i.test(line) &&
              !/nights:/i.test(line),
          ) || statusLabel;
      const existing = closuresByDate.get(date);

      closuresByDate.set(date, {
        propertyName: "Default Property",
        unitName: "",
        date,
        reason,
        note: existing?.note ? `${existing.note}\n${note}` : note,
        statusLabel,
        guestCount: Math.max(existing?.guestCount ?? 0, parsedGuestCount),
        nights: Math.max(existing?.nights ?? 0, parsedNights),
        source: "upload",
      });
    }
  }

  return Array.from(closuresByDate.values());
}

export function parseWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const bookingsSheet = getWorksheet(workbook, "Bookings");
  const expensesSheet = getWorksheet(workbook, "Expenses");
  const calendarSheet = getOptionalWorksheet(workbook, "Calendar");

  const bookingRows = getSheetRows(bookingsSheet);
  const expenseRows = getSheetRows(expensesSheet);
  const calendarRows = calendarSheet ? getSheetRows(calendarSheet) : [];

  if (!bookingRows.length) {
    throw new Error("The Bookings sheet is empty.");
  }

  if (!expenseRows.length) {
    throw new Error("The Expenses sheet is empty.");
  }

  const bookingHeaderRowIndex = findHeaderRowIndex(bookingRows, bookingColumnMap);
  const expenseHeaderRowIndex = findHeaderRowIndex(expenseRows, expenseColumnMap);
  const bookingIndexes = mapHeaderIndexes(bookingRows[bookingHeaderRowIndex], bookingColumnMap);
  const expenseIndexes = mapHeaderIndexes(expenseRows[expenseHeaderRowIndex], expenseColumnMap);

  const bookings: BookingRecord[] = bookingRows
    .slice(bookingHeaderRowIndex + 1)
    .filter((row) => !rowIsEmpty(row))
    .map((row) => {
      const checkIn = parseExcelDate(row[bookingIndexes.checkIn]);
      const checkout = parseExcelDate(row[bookingIndexes.checkout]);
      const rawRentalPeriod = row[bookingIndexes.rentalPeriod];
      const rentalPeriod = String(rawRentalPeriod ?? "").trim();
      const dateDifference =
        checkIn && checkout ? differenceInCalendarDays(new Date(checkout), new Date(checkIn)) : 0;
      const nights = Math.max(1, dateDifference || parseRentalPeriodNights(rentalPeriod) || 1);

      return {
        propertyName: "Default Property",
        unitName: "",
        checkIn,
        checkout,
        guestName: String(row[bookingIndexes.guestName] ?? "").trim() || "Guest",
        guestCount: parseCount(row[bookingIndexes.guestCount]),
        channel: normalizeChannel(row[bookingIndexes.channel]),
        rentalPeriod:
          rentalPeriod && Number.isNaN(Number(rentalPeriod)) ? rentalPeriod : `${nights} nights`,
        pricePerNight: parseCurrency(row[bookingIndexes.pricePerNight]),
        extraFee: parseCurrency(row[bookingIndexes.extraFee]),
        discount: parseCurrency(row[bookingIndexes.discount]),
        rentalRevenue: parseCurrency(row[bookingIndexes.rentalRevenue]),
        cleaningFee: parseCurrency(row[bookingIndexes.cleaningFee]),
        totalRevenue: parseCurrency(row[bookingIndexes.totalRevenue]),
        hostFee: parseCurrency(row[bookingIndexes.hostFee]),
        payout: parseCurrency(row[bookingIndexes.payout]),
        nights,
        bookingNumber: String(row[bookingIndexes.bookingNumber] ?? "").trim(),
        overbookingStatus: String(row[bookingIndexes.overbookingStatus] ?? "").trim(),
      };
    })
    .filter((booking) => booking.checkIn && booking.checkout);

  const expenses: ExpenseRecord[] = expenseRows
    .slice(expenseHeaderRowIndex + 1)
    .filter((row) => !rowIsEmpty(row))
    .map((row) => {
      const normalizedExpenseFields = normalizeExpenseFields({
        amountValue: row[expenseIndexes.amount],
        descriptionValue: row[expenseIndexes.description],
        noteValue: row[expenseIndexes.note],
      });

      return {
        propertyName: "Default Property",
        unitName: "",
        date: parseExcelDate(row[expenseIndexes.date]),
        category: String(row[expenseIndexes.category] ?? "").trim() || "Other",
        amount: normalizedExpenseFields.amount,
        description: normalizedExpenseFields.description,
        note: normalizedExpenseFields.note,
      };
    })
    .filter((expense) => expense.date);

  const closures = calendarRows.length > 0 ? parseCalendarClosures(calendarRows) : [];

  if (!bookings.length && !expenses.length && !closures.length) {
    throw new Error("No valid rows were found in the workbook.");
  }

  return {
    bookings,
    expenses,
    closures,
  };
}
