export type ImportSource = "demo" | "upload" | "manual";
export type ImportedFileSource =
  | "airbnb"
  | "booking_com"
  | "generic_excel"
  | "hostlyx_excel";
export type CurrencyCode = "USD" | "EUR" | "GBP";
export type CountryCode = "US" | "ES" | "GB";
export type SubscriptionPlan = "trial" | "starter" | "pro" | "portfolio";
export type SubscriptionStatus = "trialing" | "active" | "expired";
export type DashboardDateRangePreset =
  | "all-time"
  | "this-year"
  | "last-year"
  | "this-month"
  | "last-90-days"
  | "custom";
export type RevenueByChannelTotals = {
  airbnb: number;
  booking: number;
  other: number;
};

export type BookingRecord = {
  id?: number;
  importId?: number;
  source?: ImportSource;
  importedSource?: ImportedFileSource;
  propertyName: string;
  unitName: string;
  checkIn: string;
  checkout: string;
  guestName: string;
  guestCount: number;
  channel: string;
  rentalPeriod: string;
  pricePerNight: number;
  extraFee: number;
  discount: number;
  rentalRevenue: number;
  cleaningFee: number;
  totalRevenue: number;
  hostFee: number;
  payout: number;
  nights: number;
  bookingNumber: string;
  overbookingStatus: string;
};

export type ExpenseRecord = {
  id?: number;
  importId?: number;
  source?: ImportSource;
  propertyName: string;
  unitName: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  note: string;
};

export type CalendarClosureRecord = {
  id?: number;
  importId?: number;
  source?: ImportSource;
  propertyName: string;
  unitName: string;
  date: string;
  reason: string;
  note: string;
  statusLabel: string;
  guestCount: number;
  nights: number;
};

export type ImportSummary = {
  id: number;
  fileName: string;
  propertyName: string;
  source: ImportSource;
  importedSource: ImportedFileSource;
  importedAt: string;
  bookingsCount: number;
  expensesCount: number;
};

export type ImportValidationWarning = {
  code: string;
  message: string;
};

export type ParsedImportSummary = {
  source: ImportedFileSource;
  sourceLabel: string;
  rowsImported: number;
  bookingsImported: number;
  payoutsDetected: number;
  feesDetected: number;
  skippedRows: number;
  warnings: ImportValidationWarning[];
};

export type UserSettings = {
  businessName: string;
  primaryCountryCode: CountryCode;
  currencyCode: CurrencyCode;
  taxCountryCode: CountryCode;
  taxRate: number;
};

export type SubscriptionState = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialStartedAt: string;
  trialEndsAt: string;
  activatedAt: string | null;
  updatedAt: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
};

export type AdminUserSummary = {
  ownerEmail: string;
  businessName: string;
  subscription: SubscriptionState;
  propertiesCount: number;
  importsCount: number;
  bookingsCount: number;
  expensesCount: number;
  isAdmin: boolean;
};

export type PropertyUnit = {
  id?: number;
  name: string;
};

export type PropertyDefinition = {
  id?: number;
  name: string;
  countryCode: CountryCode;
  units: PropertyUnit[];
};

export type DashboardFilters = {
  year: number | "all";
  month: number | "all";
  channel: string | "all";
  countryCode: CountryCode | "all";
  rangePreset: DashboardDateRangePreset;
  startDate: string;
  endDate: string;
};

export type MetricCard = {
  label: string;
  value: number;
  format: "currency" | "percent" | "number";
  changeLabel?: string;
};

export type MonthlyPoint = {
  key?: string;
  label: string;
  revenue: number;
  payout: number;
  expenses: number;
  profit: number;
  bookings: number;
  guests: number;
  nights: number;
};

export type CategoryPoint = {
  label: string;
  value: number;
};

export type ChannelPoint = {
  label: string;
  revenue: number;
  bookings: number;
};

export type DashboardView = {
  availableYears: number[];
  availableChannels: string[];
  availableCountries: CountryCode[];
  filters: DashboardFilters;
  rangeLabel: string;
  displayCurrencyCode: CurrencyCode;
  mixedCurrencyMode: boolean;
  marketBreakdown: Array<{
    countryCode: CountryCode;
    currencyCode: CurrencyCode;
    revenue: number;
    payout: number;
    expenses: number;
    profit: number;
    bookings: number;
    guests: number;
    nights: number;
  }>;
  metrics: {
    totalRevenue: number;
    totalPayout: number;
    grossRevenue: number;
    netPayout: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    bookingsCount: number;
    guestsCount: number;
    nightsBooked: number;
    adr: number;
    occupancyRate: number;
    revPar: number;
    estimatedTaxes: number;
    profitAfterTax: number;
  };
  taxSettings: {
    countryCode: CountryCode;
    savedCountryCode: CountryCode;
    taxRate: number;
    suggestedTaxRate: number;
    usesSavedSettings: boolean;
    usesCustomRate: boolean;
  };
  revenueByMonth: MonthlyPoint[];
  profitByMonth: MonthlyPoint[];
  expensesByMonth: MonthlyPoint[];
  expensesByCategory: CategoryPoint[];
  revenueByChannel: ChannelPoint[];
  revenueByChannelTotals: RevenueByChannelTotals;
  recentBookings: BookingRecord[];
  recentExpenses: ExpenseRecord[];
  monthlySummary: MonthlyPoint[];
};
