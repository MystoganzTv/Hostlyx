"use client";

import { useRouter } from "next/navigation";
import { DatabaseZap, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import type { ImportSummary } from "@/lib/types";
import { formatDateLabel, formatNumber } from "@/lib/format";

export function ImportsManager({
  importSummaries,
}: {
  importSummaries: ImportSummary[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importToDelete, setImportToDelete] = useState<ImportSummary | null>(null);

  function confirmDeleteImport() {
    if (!importToDelete?.id) {
      return;
    }

    setMessage(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/import/${importToDelete.id}`, {
            method: "DELETE",
          });
          const payload = (await response.json()) as { error?: string; message?: string };

          if (!response.ok) {
            setError(payload.error ?? "The import could not be deleted.");
            return;
          }

          setMessage(payload.message ?? "Import deleted.");
          setImportToDelete(null);
          router.refresh();
        } catch {
          setError("The import could not be deleted.");
        }
      })();
    });
  }

  if (importSummaries.length === 0) {
    return (
      <div className="workspace-soft-card rounded-[22px] p-5 text-sm text-[var(--workspace-muted)]">
        No imports yet. When you upload Excel files, Hostlyx will keep the history here for backup context and traceability.
      </div>
    );
  }

  return (
    <>
      <div className="min-h-6">
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
            <tr>
              <th className="pb-3 pr-4 font-medium">File</th>
              <th className="pb-3 pr-4 font-medium">Property</th>
              <th className="pb-3 pr-4 font-medium">Imported</th>
              <th className="pb-3 pr-4 font-medium">Bookings</th>
              <th className="pb-3 pr-4 font-medium">Expenses</th>
              <th className="pb-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--workspace-border)] text-[var(--workspace-text)]">
            {importSummaries.map((entry) => (
              <tr key={entry.id}>
                <td className="py-4 pr-4">
                  <div className="flex items-start gap-3">
                    <div className="workspace-icon-chip rounded-2xl p-2.5">
                      <DatabaseZap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{entry.fileName}</p>
                      <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                        {entry.source}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 pr-4">{entry.propertyName}</td>
                <td className="py-4 pr-4">{formatDateLabel(entry.importedAt.slice(0, 10))}</td>
                <td className="py-4 pr-4">{formatNumber(entry.bookingsCount)}</td>
                <td className="py-4 pr-4">{formatNumber(entry.expensesCount)}</td>
                <td className="py-4">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setMessage(null);
                      setError(null);
                      setImportToDelete(entry);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(importToDelete)}
        title="Delete imported workbook"
        onClose={() => setImportToDelete(null)}
      >
        {importToDelete ? (
          <div className="space-y-5">
            <div className="workspace-soft-card rounded-[22px] p-4 text-sm leading-6 text-[var(--workspace-muted)]">
              Deleting <span className="font-medium text-[var(--workspace-text)]">{importToDelete.fileName}</span> will remove the import from history and permanently delete the data that batch created inside Hostlyx.
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="workspace-soft-card rounded-2xl px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Property</p>
                <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">
                  {importToDelete.propertyName}
                </p>
              </div>
              <div className="workspace-soft-card rounded-2xl px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Bookings to remove</p>
                <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">
                  {formatNumber(importToDelete.bookingsCount)}
                </p>
              </div>
              <div className="workspace-soft-card rounded-2xl px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Expenses to remove</p>
                <p className="mt-1 text-sm font-medium text-[var(--workspace-text)]">
                  {formatNumber(importToDelete.expensesCount)}
                </p>
              </div>
            </div>

            <p className="text-sm text-[var(--workspace-muted)]">
              Manual entries and data from other imports will stay untouched.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setImportToDelete(null)}
                className="workspace-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={confirmDeleteImport}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {isPending ? "Deleting import..." : "Delete import"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
