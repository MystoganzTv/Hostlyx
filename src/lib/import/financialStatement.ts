import { format } from "date-fns";
import { mapOptionalColumns, normalizeHeader, rowIsEmpty } from "./columnMatchers";
import { inferDatePreferenceFromSheet, parseImportDateDetailed } from "./dates";
import { parseMoney } from "./money";
import type { ParsedImportWorkbook } from "./types";

const airbnbFinancialColumns = {
  payout: [
    "payout",
    "netpayout",
    "yourearnings",
    "hostpayout",
    "expectedpayout",
    "paidout",
    "amountpaidout",
    "actualpaidout",
    "actualamountpaidout",
    "ganancias",
    "pagoneto",
    "ingresonetodelanfitrion",
  ],
  fees: [
    "hostservicefee",
    "hostfee",
    "servicefee",
    "airbnbservicefee",
    "comision",
    "tarifadeservicio",
  ],
  taxes: [
    "tax",
    "taxes",
    "taxamount",
    "vat",
    "iva",
    "impuestos",
    "tasas",
    "occupancytax",
    "impuestossobrelasreservas",
  ],
  date: [
    "fechadelservicio",
    "servicedate",
    "date",
    "invoicecreated",
    "issuedate",
    "payoutdate",
  ],
} as const;

const bookingFinancialColumns = {
  payout: [
    "payout",
    "netpayout",
    "payableamount",
    "amounttopayout",
    "netamount",
    "paidout",
    "amountpaidout",
    "actualpaidout",
    "actualamountpaidout",
    "pagoneto",
  ],
  fees: ["commission", "commissionamount", "platformfee", "servicefee", "comision"],
  taxes: ["tax", "taxes", "taxamount", "vat", "iva", "impuestos", "tasas"],
  date: ["date", "issuedate", "statementdate", "payoutdate", "servicedate", "fechadelservicio"],
} as const;

const airbnbStatementHeaders = [
  "numerodefactura",
  "codigodeconfirmacion",
  "fechadelservicio",
  "nombredelanfitrion",
  "numerodeidentificaciondeliva",
  "domiciliofiscal",
  "iddelanuncio",
  "nombredelanuncio",
  "listingaddress",
  "entidademisora",
  "direcciondelaentidademisora",
  "tipodeiva",
  "paisnoexentodeiva",
];

const bookingStatementHeaders = [
  "statementdate",
  "reservationnumber",
  "commission",
  "commissionamount",
  "invoice",
  "invoicenumber",
  "vat",
  "payableamount",
  "amounttopayout",
];

type FinancialStatementSource = "airbnb" | "booking";

type ExtractedFinancialStatement = {
  source: FinancialStatementSource;
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

function scoreSheetHeaders(headers: string[], providerHeaders: string[]) {
  return headers.filter((header) => providerHeaders.includes(header)).length;
}

function guessProvider(headers: string[]) {
  const airbnbScore = scoreSheetHeaders(headers, airbnbStatementHeaders);
  const bookingScore = scoreSheetHeaders(headers, bookingStatementHeaders);

  if (airbnbScore >= 3 || airbnbScore > bookingScore) {
    return "airbnb" as const;
  }

  if (bookingScore >= 2) {
    return "booking" as const;
  }

  return null;
}

export function detectFinancialStatementSource(workbook: ParsedImportWorkbook) {
  for (const sheet of workbook.sheets) {
    for (let rowIndex = 0; rowIndex < Math.min(sheet.rows.length, 8); rowIndex += 1) {
      const row = sheet.rows[rowIndex];
      if (rowIsEmpty(row)) {
        continue;
      }

      const headers = row.map((cell) => normalizeHeader(cell)).filter(Boolean);
      const provider = guessProvider(headers);
      if (provider) {
        return provider;
      }
    }
  }

  return null;
}

export function extractFinancialStatement(
  workbook: ParsedImportWorkbook,
): ExtractedFinancialStatement | null {
  let bestCandidate:
    | {
        source: FinancialStatementSource;
        sheetName: string;
        rowIndex: number;
        headers: string[];
        rawHeaders: string[];
        score: number;
      }
    | null = null;

  for (const sheet of workbook.sheets) {
    for (let rowIndex = 0; rowIndex < Math.min(sheet.rows.length, 8); rowIndex += 1) {
      const row = sheet.rows[rowIndex];
      if (rowIsEmpty(row)) {
        continue;
      }

      const rawHeaders = row.map((cell) => String(cell ?? "").trim());
      const headers = rawHeaders.map((header) => normalizeHeader(header));
      const provider = guessProvider(headers);

      if (!provider) {
        continue;
      }

      const score =
        provider === "airbnb"
          ? scoreSheetHeaders(headers, airbnbStatementHeaders)
          : scoreSheetHeaders(headers, bookingStatementHeaders);

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = {
          source: provider,
          sheetName: sheet.name,
          rowIndex,
          headers,
          rawHeaders,
          score,
        };
      }
    }
  }

  if (!bestCandidate) {
    return null;
  }

  const sheet = workbook.sheets.find((entry) => entry.name === bestCandidate.sheetName);
  if (!sheet) {
    return null;
  }

  const providerColumns =
    bestCandidate.source === "airbnb" ? airbnbFinancialColumns : bookingFinancialColumns;
  const indexes = mapOptionalColumns(sheet.rows[bestCandidate.rowIndex] ?? [], providerColumns);
  const dataRows = sheet.rows.slice(bestCandidate.rowIndex + 1).filter((row) => !rowIsEmpty(row));
  const datePreference = inferDatePreferenceFromSheet(
    sheet.rows[bestCandidate.rowIndex] ?? [],
    dataRows,
    [indexes.date],
  );

  let totalPayout = 0;
  let totalFees = 0;
  let totalTaxes = 0;
  let currency = "";
  const dates: string[] = [];

  for (const row of dataRows) {
    if (typeof indexes.payout === "number") {
      const parsed = parseMoney(row[indexes.payout]);
      if (!parsed.malformed) {
        totalPayout += parsed.value;
        currency ||= parsed.currency;
      }
    }

    if (typeof indexes.fees === "number") {
      const parsed = parseMoney(row[indexes.fees]);
      if (!parsed.malformed) {
        totalFees += Math.abs(parsed.value);
        currency ||= parsed.currency;
      }
    }

    if (typeof indexes.taxes === "number") {
      const parsed = parseMoney(row[indexes.taxes]);
      if (!parsed.malformed) {
        totalTaxes += Math.abs(parsed.value);
        currency ||= parsed.currency;
      }
    }

    if (typeof indexes.date === "number") {
      const parsedDate = parseImportDateDetailed(row[indexes.date], { datePreference });
      if (parsedDate.value) {
        dates.push(parsedDate.value);
      }
    }
  }

  const periodStart = dates.sort()[0] ?? "";
  const periodEnd = dates.sort()[dates.length - 1] ?? periodStart;
  const periodLabel =
    periodStart && periodEnd
      ? periodStart === periodEnd
        ? format(new Date(periodStart), "MMM d, yyyy")
        : `${format(new Date(periodStart), "MMM d, yyyy")} - ${format(new Date(periodEnd), "MMM d, yyyy")}`
      : "Detected statement period";

  if (totalPayout === 0 && totalFees === 0 && totalTaxes === 0) {
    return null;
  }

  return {
    source: bestCandidate.source,
    period: {
      start: periodStart,
      end: periodEnd || periodStart,
      label: periodLabel,
    },
    totalPayout,
    totalFees,
    totalTaxes,
    currency,
    rawData: JSON.stringify(
      {
        sheetName: bestCandidate.sheetName,
        headers: bestCandidate.rawHeaders,
        previewRows: dataRows.slice(0, 12).map((row) =>
          row.map((cell) => (cell instanceof Date ? cell.toISOString() : cell)),
        ),
      },
      null,
      2,
    ),
  };
}
