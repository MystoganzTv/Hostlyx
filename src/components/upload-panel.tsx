"use client";

import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, LoaderCircle, UploadCloud } from "lucide-react";

type UploadState = "idle" | "uploading" | "success" | "error";

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

export function UploadPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setUploadState("error");
      setMessage("Choose an .xlsx workbook before importing.");
      return;
    }

    setUploadState("uploading");
    setMessage(`Uploading ${selectedFile.name}...`);

    try {
      const upload = new FormData();
      upload.set("file", selectedFile);

      const response = await fetch("/api/import", {
        method: "POST",
        body: upload,
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setUploadState("error");
        setMessage(
          payload.error ?? "Import failed. Check the workbook format and try again.",
        );
        return;
      }

      setUploadState("success");
      setMessage(payload.message ?? `${selectedFile.name} imported successfully.`);
      router.refresh();
    } catch {
      setUploadState("error");
      setMessage("Import failed. Check the workbook format and try again.");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);

    if (!nextFile) {
      setUploadState("idle");
      setMessage(null);
      return;
    }

    setUploadState("idle");
    setMessage(`${nextFile.name} selected and ready to import.`);
  }

  const statusTone =
    uploadState === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : uploadState === "error"
        ? "border-rose-200 bg-rose-50 text-rose-600"
        : "border-[var(--workspace-border)] bg-[var(--workspace-panel-soft)] text-[var(--workspace-muted)]";

  return (
    <div className="workspace-card rounded-[30px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--workspace-muted)]">
            Import Workbook
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
            Reads only `Bookings` and `Expenses`. New uploads are saved to the system and exact duplicates are skipped.
          </p>
        </div>
        <div className="workspace-icon-chip rounded-3xl p-3">
          <UploadCloud className="h-6 w-6" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={handleFileChange}
        />

        <div className="workspace-soft-card rounded-[22px] border border-dashed p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="block text-sm font-medium text-[var(--workspace-text)]">
                Excel workbook
              </span>
              <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                {selectedFile
                  ? "File selected and ready to import."
                  : "Choose your .xlsx file to start the import."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.click();
                }
              }}
              disabled={uploadState === "uploading"}
              className="workspace-button-secondary inline-flex shrink-0 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {selectedFile ? "Choose another file" : "Choose file"}
            </button>
          </div>

          <div className="mt-4 rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-4">
            <div className="flex items-start gap-3">
              <div className="workspace-icon-chip rounded-2xl p-2">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--workspace-text)]">
                  {selectedFile ? selectedFile.name : "No file selected yet"}
                </p>
                <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                  {selectedFile ? formatFileSize(selectedFile.size) : "Only .xlsx workbooks are supported."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={uploadState === "uploading" || !selectedFile}
          className="workspace-button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploadState === "uploading" ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Importing workbook...
            </>
          ) : (
            "Import workbook"
          )}
        </button>
      </form>

      <div className={`mt-4 rounded-[20px] border p-4 text-sm ${statusTone}`}>
        <div className="flex items-start gap-3">
          {uploadState === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : uploadState === "uploading" ? (
            <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <UploadCloud className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p>
            {message ??
              "Pick a workbook first. After import, this panel will confirm whether it succeeded or failed."}
          </p>
        </div>
      </div>
    </div>
  );
}
