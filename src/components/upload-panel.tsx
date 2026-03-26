"use client";

import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";
import type { PropertyDefinition } from "@/lib/types";

type UploadState = "idle" | "uploading" | "success" | "error";

function inputClassName() {
  return "input-surface w-full rounded-2xl px-4 py-3 text-sm";
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

function mergeFiles(currentFiles: File[], incomingFiles: File[]) {
  const nextFiles = [...currentFiles];

  for (const incomingFile of incomingFiles) {
    const alreadyIncluded = nextFiles.some(
      (file) =>
        file.name === incomingFile.name &&
        file.size === incomingFile.size &&
        file.lastModified === incomingFile.lastModified,
    );

    if (!alreadyIncluded) {
      nextFiles.push(incomingFile);
    }
  }

  return nextFiles;
}

export function UploadPanel({
  properties,
}: {
  properties: PropertyDefinition[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPropertyName, setSelectedPropertyName] = useState(properties[0]?.name ?? "");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setUploadState("error");
      setMessage("Choose at least one .xlsx workbook before importing.");
      return;
    }

    if (!selectedPropertyName) {
      setUploadState("error");
      setMessage("Choose the property that this workbook belongs to.");
      return;
    }

    setUploadState("uploading");
    setMessage(
      selectedFiles.length === 1
        ? `Uploading ${selectedFiles[0].name} into ${selectedPropertyName}...`
        : `Uploading ${selectedFiles.length} workbooks into ${selectedPropertyName}...`,
    );

    try {
      const upload = new FormData();
      for (const file of selectedFiles) {
        upload.append("files", file);
      }
      upload.set("propertyName", selectedPropertyName);

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
      setMessage(
        payload.message ??
          (selectedFiles.length === 1
            ? `${selectedFiles[0].name} imported successfully.`
            : `${selectedFiles.length} workbooks imported successfully.`),
      );
      router.refresh();
    } catch {
      setUploadState("error");
      setMessage("Import failed. Check the workbook format and try again.");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const incomingFiles = Array.from(event.target.files ?? []);
    const nextFiles = mergeFiles(selectedFiles, incomingFiles);
    setSelectedFiles(nextFiles);
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    if (nextFiles.length === 0) {
      setUploadState("idle");
      setMessage(null);
      return;
    }

    setUploadState("idle");
    setMessage(
      nextFiles.length === 1
        ? `${nextFiles[0].name} selected and ready to import.`
        : `${nextFiles.length} workbooks selected and ready to import.`,
    );
  }

  function removeSelectedFile(fileToRemove: File) {
    const nextFiles = selectedFiles.filter(
      (file) =>
        !(
          file.name === fileToRemove.name &&
          file.size === fileToRemove.size &&
          file.lastModified === fileToRemove.lastModified
        ),
    );

    setSelectedFiles(nextFiles);
    setUploadState("idle");
    setMessage(
      nextFiles.length === 0
        ? "All selected workbooks were removed."
        : nextFiles.length === 1
          ? `${nextFiles[0].name} still selected and ready to import.`
          : `${nextFiles.length} workbooks selected and ready to import.`,
    );
  }

  function clearSelectedFiles() {
    setSelectedFiles([]);
    setUploadState("idle");
    setMessage("Selection cleared. Choose one or more .xlsx workbooks to import.");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const statusTone =
    uploadState === "success"
      ? "border-emerald-400/24 bg-emerald-400/10 text-emerald-200"
      : uploadState === "error"
        ? "border-rose-400/24 bg-rose-400/10 text-rose-200"
        : "border-[var(--workspace-border)] bg-[var(--workspace-panel-soft)] text-[var(--workspace-muted)]";

  return (
    <div className="workspace-card rounded-[30px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--workspace-muted)]">
            Spreadsheet Intake
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
            Use Excel only to bring legacy `Bookings` and `Expenses` into Hostlyx. Once imported, the records live in the app as normal data and the workbook stays in Import History as backup traceability. Exact duplicates are skipped automatically.
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
          name="files"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          multiple
          className="sr-only"
          onChange={handleFileChange}
        />

        <div className="workspace-soft-card rounded-[22px] border border-dashed p-4">
          <div className="mb-4 space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Target property
            </span>
            {properties.length > 1 ? (
              <select
                className={inputClassName()}
                value={selectedPropertyName}
                onChange={(event) => setSelectedPropertyName(event.target.value)}
              >
                {properties.map((property) => (
                  <option key={property.id ?? property.name} value={property.name}>
                    {property.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-[18px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] px-4 py-3 text-sm text-[var(--workspace-text)]">
                {selectedPropertyName}
              </div>
            )}
            <p className="text-xs text-[var(--workspace-muted)]">
              Imported bookings and expenses will be assigned to this property, then managed inside Hostlyx like any other saved record.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="block text-sm font-medium text-[var(--workspace-text)]">
                Excel workbooks
              </span>
              <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                {selectedFiles.length > 0
                  ? selectedFiles.length === 1
                    ? "1 file selected and ready to import."
                    : `${selectedFiles.length} files selected and ready to import.`
                  : "Choose one or more .xlsx workbooks to migrate legacy data in."}
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
              {selectedFiles.length > 0 ? "Add more files" : "Select files"}
            </button>
          </div>

          <div className="mt-4 rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] p-4">
            <div className="flex items-start gap-3">
              <div className="workspace-icon-chip rounded-2xl p-2">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                {selectedFiles.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--workspace-muted)]">
                        Selected files
                      </p>
                      {selectedFiles.length > 1 ? (
                        <button
                          type="button"
                          onClick={clearSelectedFiles}
                          disabled={uploadState === "uploading"}
                          className="text-xs font-semibold text-[var(--workspace-accent)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Clear all
                        </button>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {selectedFiles.map((file) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--workspace-border)] bg-white/[0.02] px-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--workspace-text)]">
                              {file.name}
                            </p>
                            <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${file.name}`}
                            onClick={() => removeSelectedFile(file)}
                            disabled={uploadState === "uploading"}
                            className="workspace-button-secondary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="truncate text-sm font-medium text-[var(--workspace-text)]">
                      No file selected yet
                    </p>
                    <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                      Only .xlsx workbooks are supported.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={uploadState === "uploading" || selectedFiles.length === 0}
          className="workspace-button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploadState === "uploading" ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Moving data into Hostlyx...
            </>
          ) : (
            selectedFiles.length > 1 ? "Import into Hostlyx" : "Import into Hostlyx"
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
              "Pick one or more workbooks first. After import, Hostlyx will confirm the result and keep the batch in Import History while the records stay editable inside the app."}
          </p>
        </div>
      </div>
    </div>
  );
}
