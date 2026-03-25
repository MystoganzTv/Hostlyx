export type ImportSource = "demo" | "upload" | "manual";

export type BookingRecord = {
  id?: number;
  importId?: number;
  source?: ImportSource;
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
};

export type ExpenseRecord = {
  id?: number;
  importId?: number;
  source?: ImportSource;
  date: string;
  category: string;
  amount: number;
  description: string;
  note: string;
};

export type ImportSummary = {
  id: number;
  fileName: string;
  source: ImportSource;
  importedAt: string;
  bookingsCount: number;
  expensesCount: number;
};

export type DashboardFilters = {
  year: number | "all";
  month: number | "all";
  channel: string | "all";
};

export type MetricCard = {
  label: string;
  value: number;
  format: "currency" | "percent" | "number";
  changeLabel?: string;
};

export type MonthlyPoint = {
  label: string;
  revenue: number;
  payout: number;
  expenses: number;
  profit: number;
  bookings: number;
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
  filters: DashboardFilters;
  metrics: {
    grossRevenue: number;
    netPayout: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    bookingsCount: number;
    nightsBooked: number;
    adr: number;
    occupancyRate: number;
    revPar: number;
  };
  revenueByMonth: MonthlyPoint[];
  profitByMonth: MonthlyPoint[];
  expensesByCategory: CategoryPoint[];
  revenueByChannel: ChannelPoint[];
  recentBookings: BookingRecord[];
  recentExpenses: ExpenseRecord[];
  monthlySummary: MonthlyPoint[];
};
