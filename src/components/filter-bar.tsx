"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect } from "react";

const monthOptions = [
  { value: "all", label: "All months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const filterStorageKey = "hostlyx:filters";

function selectClassName() {
  return "input-surface w-full rounded-2xl px-4 py-3 text-sm";
}

export function FilterBar({
  years,
  channels,
  selectedYear,
  selectedMonth,
  selectedChannel,
}: {
  years: number[];
  channels: string[];
  selectedYear: number | "all";
  selectedMonth: number | "all";
  selectedChannel: string | "all";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasExplicitFilters =
      searchParams.has("year") || searchParams.has("month") || searchParams.has("channel");

    if (hasExplicitFilters) {
      return;
    }

    const savedFilters = window.localStorage.getItem(filterStorageKey);

    if (!savedFilters) {
      return;
    }

    try {
      const parsed = JSON.parse(savedFilters) as {
        year?: string;
        month?: string;
        channel?: string;
      };
      const params = new URLSearchParams(searchParams.toString());

      if (parsed.year) {
        params.set("year", parsed.year);
      }

      if (parsed.month) {
        params.set("month", parsed.month);
      }

      if (parsed.channel) {
        params.set("channel", parsed.channel);
      }

      if (params.toString()) {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    } catch {
      window.localStorage.removeItem(filterStorageKey);
    }
  }, [pathname, router, searchParams]);

  function updateFilter(key: "year" | "month" | "channel", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);

    if (key === "year" && value === "all") {
      params.set("month", "all");
    }

    window.localStorage.setItem(
      filterStorageKey,
      JSON.stringify({
        year: params.get("year") ?? "all",
        month: params.get("month") ?? "all",
        channel: params.get("channel") ?? "all",
      }),
    );

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="card-surface rounded-[28px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-text)]/80">
            Filters
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Narrow the view by reporting year, month, and booking channel.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[560px]">
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Year
            </span>
            <select
              className={selectClassName()}
              value={String(selectedYear)}
              onChange={(event) => updateFilter("year", event.target.value)}
            >
              <option value="all">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Month
            </span>
            <select
              className={selectClassName()}
              value={String(selectedMonth)}
              onChange={(event) => updateFilter("month", event.target.value)}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Channel
            </span>
            <select
              className={selectClassName()}
              value={selectedChannel}
              onChange={(event) => updateFilter("channel", event.target.value)}
            >
              <option value="all">All channels</option>
              {channels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
