"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryPoint, ChannelPoint, CurrencyCode, MonthlyPoint } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { SectionCard } from "./section-card";

const pieColors = ["#65b5ae", "#7a94d6", "#f2b26b", "#ec8f96", "#8d81d9", "#7ccf99"];

function compactCurrency(value: number, currencyCode: CurrencyCode) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTooltipValue(
  value: string | number | readonly (string | number)[] | undefined,
  currencyCode: CurrencyCode,
) {
  const normalized = Array.isArray(value) ? value[0] : value;
  return formatCurrency(Number(normalized ?? 0), true, currencyCode);
}

function EmptyChartState({ label }: { label: string }) {
  return (
    <div className="workspace-soft-card flex h-[280px] items-center justify-center rounded-[22px] border-dashed text-sm text-[var(--workspace-muted)]">
      {label}
    </div>
  );
}

export function ChartsPanel({
  revenueByMonth,
  profitByMonth,
  expensesByCategory,
  revenueByChannel,
  currencyCode,
}: {
  revenueByMonth: MonthlyPoint[];
  profitByMonth: MonthlyPoint[];
  expensesByCategory: CategoryPoint[];
  revenueByChannel: ChannelPoint[];
  currencyCode: CurrencyCode;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard
        title="Revenue by month"
        subtitle="Gross revenue trend from the filtered booking data."
        className="min-w-0"
      >
        {revenueByMonth.length === 0 ? (
          <EmptyChartState label="No revenue data for the current filters." />
        ) : (
          <div className="h-[280px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#65b5ae" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#65b5ae" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e7edf5" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#70829e", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => compactCurrency(value, currencyCode)}
                  tick={{ fill: "#70829e", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip
                  formatter={(value) => formatTooltipValue(value, currencyCode)}
                  contentStyle={{
                    borderRadius: 18,
                    border: "1px solid #e4ebf3",
                    background: "#ffffff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#65b5ae"
                  strokeWidth={3}
                  fill="url(#revenue-fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Profit by month"
        subtitle="Net payout minus expenses for each month in view."
        className="min-w-0"
      >
        {profitByMonth.length === 0 ? (
          <EmptyChartState label="No profit data for the current filters." />
        ) : (
          <div className="h-[280px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitByMonth}>
                <CartesianGrid stroke="#e7edf5" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#70829e", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => compactCurrency(value, currencyCode)}
                  tick={{ fill: "#70829e", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip
                  formatter={(value) => formatTooltipValue(value, currencyCode)}
                  contentStyle={{
                    borderRadius: 18,
                    border: "1px solid #e4ebf3",
                    background: "#ffffff",
                  }}
                />
                <Bar dataKey="profit" radius={[10, 10, 0, 0]} fill="#7a94d6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Expenses by category"
        subtitle="Top expense groups based on imported operating costs."
        className="min-w-0"
      >
        {expensesByCategory.length === 0 ? (
          <EmptyChartState label="No expenses match the current filters." />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={72}
                    outerRadius={108}
                    paddingAngle={3}
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell
                        key={entry.label}
                        fill={pieColors[index % pieColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatTooltipValue(value, currencyCode)}
                    contentStyle={{
                      borderRadius: 18,
                      border: "1px solid #e4ebf3",
                      background: "#ffffff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {expensesByCategory.slice(0, 6).map((item, index) => (
                <div
                  key={item.label}
                  className="workspace-soft-card flex items-center justify-between rounded-2xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: pieColors[index % pieColors.length],
                      }}
                    />
                    <span className="text-sm text-[var(--workspace-text)]">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-[var(--workspace-text)]">
                    {formatCurrency(item.value, false, currencyCode)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Revenue by channel"
        subtitle="Channel mix across the filtered booking set."
        className="min-w-0"
      >
        {revenueByChannel.length === 0 ? (
          <EmptyChartState label="No channel data for the current filters." />
        ) : (
          <div className="h-[280px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByChannel} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#e7edf5" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => compactCurrency(value, currencyCode)}
                  tick={{ fill: "#70829e", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: "#42536e", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={92}
                />
                <Tooltip
                  formatter={(value) => formatTooltipValue(value, currencyCode)}
                  contentStyle={{
                    borderRadius: 18,
                    border: "1px solid #e4ebf3",
                    background: "#ffffff",
                  }}
                />
                <Bar dataKey="revenue" radius={[0, 12, 12, 0]} fill="#f2b26b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
