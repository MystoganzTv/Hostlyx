"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { UploadCloud } from "lucide-react";

export function UploadPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose an .xlsx workbook before importing.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const upload = new FormData();
          upload.set("file", file);

          const response = await fetch("/api/import", {
            method: "POST",
            body: upload,
          });

          const payload = (await response.json()) as {
            error?: string;
            message?: string;
          };

          if (!response.ok) {
            setError(
              payload.error ??
                "Import failed. Check the workbook format and try again.",
            );
            return;
          }

          setMessage(payload.message ?? "Workbook imported.");
          router.refresh();
        } catch {
          setError("Import failed. Check the workbook format and try again.");
        }
      })();
    });
  }

  return (
    <div className="rounded-[30px] border border-white/8 bg-white/[0.02] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-200/75">
            Import Workbook
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Reads only `Bookings` and `Expenses`. Manual rows stay untouched.
          </p>
        </div>
        <div className="rounded-3xl border border-teal-400/20 bg-teal-400/10 p-3 text-teal-200">
          <UploadCloud className="h-6 w-6" />
        </div>
      </div>

      <form action={handleSubmit} className="mt-6 space-y-4">
        <label className="block rounded-[22px] border border-dashed border-white/15 bg-white/[0.03] p-4 transition hover:border-teal-300/40 hover:bg-white/[0.05]">
          <span className="mb-3 block text-sm font-medium text-slate-200">
            Excel workbook
          </span>
          <input
            type="file"
            name="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="block w-full cursor-pointer text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-teal-300/15 file:px-4 file:py-2 file:font-medium file:text-teal-100"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-teal-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Importing workbook..." : "Import workbook"}
        </button>
      </form>

      <div className="mt-4 min-h-6">
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}
