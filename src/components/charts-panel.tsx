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
import type { CategoryPoint, ChannelPoint, MonthlyPoint } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { SectionCard } from "./section-card";

const pieColors = ["#5eead4", "#38bdf8", "#f59e0b", "#fb7185", "#a78bfa", "#34d399"];

function compactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTooltipValue(
  value: string | number | readonly (string | number)[] | undefined,
) {
  const normalized = Array.isArray(value) ? value[0] : value;
  return formatCurrency(Number(normalized ?? 0), true);
}

function EmptyChartState({ label }: { label: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] text-sm text-slate-500">
      {label}
    </div>
  );
}

export function ChartsPanel({
  revenueByMonth,
  profitByMonth,
  expensesByCategory,
  revenueByChannel,
}: {
  revenueByMonth: MonthlyPoint[];
  profitByMonth: MonthlyPoint[];
  expensesByCategory: CategoryPoint[];
  revenueByChannel: ChannelPoint[];
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
                    <stop offset="5%" stopColor="#5eead4" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#5eead4" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={compactCurrency}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip
                  formatter={(value) => formatTooltipValue(value)}
                  contentStyle={{
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.18)",
                    background: "rgba(7,17,28,0.96)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#5eead4"
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
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={compactCurrency}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip
                  formatter={(value) => formatTooltipValue(value)}
                  contentStyle={{
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.18)",
                    background: "rgba(7,17,28,0.96)",
                  }}
                />
                <Bar dataKey="profit" radius={[10, 10, 0, 0]} fill="#38bdf8" />
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
                    formatter={(value) => formatTooltipValue(value)}
                    contentStyle={{
                      borderRadius: 18,
                      border: "1px solid rgba(148,163,184,0.18)",
                      background: "rgba(7,17,28,0.96)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {expensesByCategory.slice(0, 6).map((item, index) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: pieColors[index % pieColors.length],
                      }}
                    />
                    <span className="text-sm text-slate-200">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-100">
                    {formatCurrency(item.value)}
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
                <CartesianGrid stroke="rgba(148,163,184,0.08)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={compactCurrency}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: "#cbd5e1", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={92}
                />
                <Tooltip
                  formatter={(value) => formatTooltipValue(value)}
                  contentStyle={{
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.18)",
                    background: "rgba(7,17,28,0.96)",
                  }}
                />
                <Bar dataKey="revenue" radius={[0, 12, 12, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
