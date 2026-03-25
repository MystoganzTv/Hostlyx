import { format, parseISO } from "date-fns";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const preciseCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatCurrency(value: number, precise = false) {
  return (precise ? preciseCurrencyFormatter : currencyFormatter).format(
    Number.isFinite(value) ? value : 0,
  );
}

export function formatPercent(value: number) {
  return percentFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number) {
  return numberFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatMetricValue(
  value: number,
  type: "currency" | "percent" | "number",
) {
  if (type === "percent") {
    return formatPercent(value);
  }

  if (type === "number") {
    return formatNumber(value);
  }

  return formatCurrency(value);
}

export function formatDateLabel(value: string) {
  return format(parseISO(value), "MMM d, yyyy");
}
