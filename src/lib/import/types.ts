export type ImportDetectedSource = "airbnb" | "booking" | "generic" | "unknown";

export type ImportCellValue = string | number | boolean | Date | null | undefined;
export type ImportSheetRow = ImportCellValue[];

export type RawImportRow = Record<string, string | number | null>;

export type ImportRowType = "booking" | "expense" | "file";

export type ImportValidationWarning = {
  rowType: ImportRowType;
  rowIndex: number;
  code: string;
  message: string;
  severity: "warning" | "error";
};

export type ImportDuplicateFlag = {
  rowType: "booking" | "expense" | "file";
  rowIndex: number;
  code: string;
  message: string;
  severity: "warning";
  matchType: "reference" | "fallback";
  matchScope: "file" | "existing";
};

export type NormalizedImportBooking = {
  source: ImportDetectedSource;
  propertyName: string;
  bookingReference: string;
  guestName: string;
  channel: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  grossRevenue: number;
  platformFee: number;
  cleaningFee: number;
  payout: number;
  currency: string;
  status: string;
  rawRow: RawImportRow;
};

export type NormalizedImportExpense = {
  source: ImportDetectedSource;
  propertyName: string;
  date: string;
  category: string;
  description: string;
  note: string;
  amount: number;
  rawRow: RawImportRow;
};

export type ImportBookingCandidate = {
  rowIndex: number;
  booking: NormalizedImportBooking;
  warnings: ImportValidationWarning[];
  duplicate?: ImportDuplicateFlag;
};

export type ImportExpenseCandidate = {
  rowIndex: number;
  expense: NormalizedImportExpense;
  warnings: ImportValidationWarning[];
};

export type ImportPreviewRow = Pick<
  NormalizedImportBooking,
  "guestName" | "channel" | "checkIn" | "checkOut" | "grossRevenue" | "payout"
>;

export type ImportReviewSection = "valid" | "warnings" | "duplicates" | "errors";

export type ImportManualMappingField =
  | "guestName"
  | "checkIn"
  | "checkOut"
  | "grossRevenue"
  | "payout"
  | "propertyName";

export type ImportManualMappingOption = {
  index: number;
  label: string;
};

export type ImportManualMapping = {
  sheetName: string;
  headerRowIndex: number;
  guestName: number | null;
  checkIn: number | null;
  checkOut: number | null;
  grossRevenue: number | null;
  payout: number | null;
  propertyName: number | null;
};

export type ImportManualMappingPreview = {
  message: string;
  sheetName: string;
  headerRowIndex: number;
  columns: ImportManualMappingOption[];
  suggested: Record<ImportManualMappingField, number | null>;
  selected: Record<ImportManualMappingField, number | null>;
  requiredReady: boolean;
};

export type ImportReviewRow = {
  id: string;
  rowType: "booking" | "expense";
  rowIndex: number;
  section: ImportReviewSection;
  title: string;
  subtitle: string;
  reasons: string[];
};

export type ImportPreview = {
  source: ImportDetectedSource;
  sourceLabel: string;
  fileName: string;
  requiresManualMapping: boolean;
  manualMapping: ImportManualMappingPreview | null;
  totalRowsRead: number;
  validRows: number;
  warningRows: number;
  duplicateRows: number;
  errorRows: number;
  skippedRows: number;
  expensesDetected: number;
  importableRows: number;
  bookings: ImportBookingCandidate[];
  expenses: ImportExpenseCandidate[];
  previewRows: ImportPreviewRow[];
  reviewRows: Record<ImportReviewSection, ImportReviewRow[]>;
  warnings: ImportValidationWarning[];
  duplicates: ImportDuplicateFlag[];
  canImport: boolean;
};

export type ImportNormalizationResult = {
  source: ImportDetectedSource;
  bookings: ImportBookingCandidate[];
  expenses: ImportExpenseCandidate[];
  warnings: ImportValidationWarning[];
  duplicates: ImportDuplicateFlag[];
  skippedRows: number;
  totalRowsRead: number;
};

export type ParsedImportSheet = {
  name: string;
  normalizedName: string;
  rows: ImportSheetRow[];
};

export type ParsedImportWorkbook = {
  fileName: string;
  sheets: ParsedImportSheet[];
};

export function getDetectedSourceLabel(source: ImportDetectedSource) {
  switch (source) {
    case "airbnb":
      return "Airbnb";
    case "booking":
      return "Booking.com";
    case "generic":
      return "Generic Excel";
    default:
      return "Unknown format";
  }
}
