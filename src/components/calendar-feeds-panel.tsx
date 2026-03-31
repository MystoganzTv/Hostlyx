"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { Link2, RefreshCw, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import type { IcalFeedRecord } from "@/lib/types";

function getSourceLabel(source: IcalFeedRecord["source"]) {
  if (source === "booking") {
    return "Booking.com";
  }

  if (source === "vrbo") {
    return "Vrbo";
  }

  if (source === "other") {
    return "Other";
  }

  return "Airbnb";
}

function getStatusTone(status: IcalFeedRecord["lastSyncStatus"]) {
  if (status === "success") {
    return "border-emerald-300/18 bg-emerald-400/10 text-emerald-50";
  }

  if (status === "error") {
    return "border-rose-300/18 bg-rose-400/10 text-rose-50";
  }

  if (status === "pending") {
    return "border-amber-300/18 bg-amber-400/10 text-amber-50";
  }

  return "border-white/10 bg-white/[0.04] text-[var(--workspace-muted)]";
}

function getStatusLabel(feed: IcalFeedRecord) {
  if (feed.lastSyncStatus === "success") {
    return "Synced";
  }

  if (feed.lastSyncStatus === "error") {
    return "Error";
  }

  if (feed.lastSyncStatus === "pending") {
    return "Syncing";
  }

  return "Never synced";
}

function formatLastSynced(value: string | null | undefined) {
  if (!value) {
    return "Not synced yet";
  }

  const parsed = parseISO(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not synced yet";
  }

  return formatDistanceToNowStrict(parsed, { addSuffix: true });
}

function maskFeedUrl(feedUrl: string) {
  try {
    const parsedUrl = new URL(feedUrl);
    return `${parsedUrl.hostname}${parsedUrl.pathname}`;
  } catch {
    return feedUrl;
  }
}

export function CalendarFeedsPanel({
  feeds,
}: {
  feeds: IcalFeedRecord[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeFeeds = useMemo(() => feeds.filter((feed) => feed.isActive), [feeds]);
  const latestSyncedAt = useMemo(() => {
    const timestamps = activeFeeds
      .map((feed) => {
        if (!feed.lastSyncedAt) {
          return null;
        }

        const parsed = parseISO(feed.lastSyncedAt);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      })
      .filter((value): value is Date => value instanceof Date);

    if (timestamps.length === 0) {
      return null;
    }

    return timestamps.sort((left, right) => right.getTime() - left.getTime())[0];
  }, [activeFeeds]);
  const totalEvents = activeFeeds.reduce((sum, feed) => sum + feed.eventCount, 0);

  function refreshFeed(feedId: number) {
    setMessage(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/calendar/feeds/${feedId}/sync`, {
            method: "POST",
          });
          const payload = (await response.json()) as { error?: string; message?: string };

          if (!response.ok) {
            setError(payload.error ?? "The iCal feed could not be refreshed.");
            return;
          }

          setMessage(payload.message ?? "Feed refreshed.");
          router.refresh();
        } catch {
          setError("The iCal feed could not be refreshed.");
        }
      })();
    });
  }

  function disconnectFeed(feedId: number) {
    setMessage(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/calendar/feeds/${feedId}`, {
            method: "DELETE",
          });
          const payload = (await response.json()) as { error?: string; message?: string };

          if (!response.ok) {
            setError(payload.error ?? "The iCal feed could not be disconnected.");
            return;
          }

          setMessage(payload.message ?? "Feed disconnected.");
          router.refresh();
        } catch {
          setError("The iCal feed could not be disconnected.");
        }
      })();
    });
  }

  if (feeds.length === 0) {
    return null;
  }

  return (
    <>
      <div className="workspace-card rounded-[24px] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-lg font-semibold text-[var(--workspace-text)]">Connected iCal</p>
              <p className="mt-1 text-sm leading-6 text-[var(--workspace-muted)]">
                {activeFeeds.length} active feed{activeFeeds.length === 1 ? "" : "s"} syncing into Calendar only.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--workspace-muted)]">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                {totalEvents} synced event{totalEvents === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                {latestSyncedAt
                  ? `Latest sync ${formatDistanceToNowStrict(latestSyncedAt, { addSuffix: true })}`
                  : "Waiting for first sync"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeFeeds.map((feed) => (
                <span
                  key={feed.id}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--workspace-text)]"
                >
                  {feed.propertyName} · {getSourceLabel(feed.source)}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="workspace-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition"
          >
            <Link2 className="h-4 w-4" />
            Manage feeds
          </button>
        </div>
      </div>

      <Modal
        open={isModalOpen}
        title="Connected iCal feeds"
        onClose={() => setIsModalOpen(false)}
        alignTop
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[var(--workspace-muted)]">
            Saved calendar connections stay separate from financial bookings. Use them for occupancy,
            check-ins, check-outs, and blocked dates.
          </p>

          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="text-sm text-rose-500">{error}</p> : null}

          <div className="grid gap-4 xl:grid-cols-2">
            {feeds.map((feed) => (
              <article key={feed.id} className="workspace-soft-card rounded-[24px] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="workspace-icon-chip rounded-2xl p-2.5">
                        <Link2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--workspace-text)]">
                          {feed.propertyName}
                        </p>
                        <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                          {feed.listingName || "Primary listing"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getStatusTone(feed.lastSyncStatus)}`}
                  >
                    {getStatusLabel(feed)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-[var(--workspace-border)] bg-white/[0.02] px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--workspace-muted)]">
                      Source
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--workspace-text)]">
                      {getSourceLabel(feed.source)}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[var(--workspace-border)] bg-white/[0.02] px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--workspace-muted)]">
                      Events
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--workspace-text)]">
                      {feed.eventCount}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[var(--workspace-border)] bg-white/[0.02] px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--workspace-muted)]">
                      Last synced
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--workspace-text)]">
                      {formatLastSynced(feed.lastSyncedAt)}
                    </p>
                  </div>
                </div>

                <p className="mt-4 truncate text-xs text-[var(--workspace-muted)]">
                  {maskFeedUrl(feed.feedUrl)}
                </p>

                {feed.lastError ? (
                  <div className="mt-4 rounded-[18px] border border-rose-300/18 bg-rose-400/10 px-3 py-3 text-sm text-rose-50">
                    {feed.lastError}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => refreshFeed(Number(feed.id))}
                    disabled={isPending || !feed.id}
                    className="workspace-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                    Refresh now
                  </button>
                  <button
                    type="button"
                    onClick={() => disconnectFeed(Number(feed.id))}
                    disabled={isPending || !feed.id}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/16 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Disconnect
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
