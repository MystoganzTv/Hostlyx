"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  TriangleAlert,
  UploadCloud,
  X,
} from "lucide-react";
import type { PropertyDefinition } from "@/lib/types";
import { WorkspaceSelect } from "@/components/workspace-select";

type UploadState = "idle" | "uploading" | "success" | "error";
type FileStatus = "checking" | "ready" | "duplicate-existing" | "duplicate-selection" | "error";
type ToastTone = "success" | "error" | "info";
type DuplicateMatch = {
  workbookHash: string;
  fileName: string;
  propertyName: string;
  importedAt: string;
};
type SelectedFileMeta = {
  status: FileStatus;
  hash?: string;
  duplicateMatch?: DuplicateMatch;
};
type UploadToast = {
  tone: ToastTone;
  message: string;
};

type ImportWarning = {
  code: string;
  message: string;
};

type ImportedFileResult = {
  fileName: string;
  source: string;
  sourceLabel: string;
  rowsImported: number;
  bookingsImported: number;
  payoutsDetected: number;
  feesDetected: number;
  skippedRows: number;
  warnings: ImportWarning[];
};

type ImportedBatchSummary = {
  rowsImported: number;
  bookingsImported: number;
  payoutsDetected: number;
  feesDetected: number;
  skippedRows: number;
};

type ImportResponsePayload = {
  error?: string;
  message?: string;
  imports?: ImportedFileResult[];
  summary?: ImportedBatchSummary;
};

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

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function formatImportedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

async function hashFile(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function parseImportResponse(response: Response) {
  const rawResponse = await response.text();
  let payload: ImportResponsePayload = {};

  try {
    payload = rawResponse ? (JSON.parse(rawResponse) as ImportResponsePayload) : {};
  } catch {
    payload = {};
  }

  return { rawResponse, payload };
}

export function UploadPanel({
  properties,
  title = "Import Center",
  subtitle = "Drop Airbnb, Booking.com, or generic CSV/XLSX exports into Hostlyx. The system will normalize bookings, payouts, and fees into your live financial workspace, while exact duplicates are skipped automatically.",
  refreshOnSuccess = true,
  onImportComplete,
}: {
  properties: PropertyDefinition[];
  title?: string;
  subtitle?: string;
  refreshOnSuccess?: boolean;
  onImportComplete?: (payload: { importedFilesCount: number; propertyName: string }) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPropertyName, setSelectedPropertyName] = useState(properties[0]?.name ?? "");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [selectedFileMeta, setSelectedFileMeta] = useState<Record<string, SelectedFileMeta>>({});
  const [toast, setToast] = useState<UploadToast | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastImportedBatch, setLastImportedBatch] = useState<{
    propertyName: string;
    imports: ImportedFileResult[];
    summary: ImportedBatchSummary;
  } | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 4800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    async function inspectFiles() {
      if (selectedFiles.length === 0) {
        setSelectedFileMeta({});
        return;
      }

      const checkingState = Object.fromEntries(
        selectedFiles.map((file) => [getFileKey(file), { status: "checking" as const }]),
      );
      setSelectedFileMeta(checkingState);

      try {
        const hashedFiles = await Promise.all(
          selectedFiles.map(async (file) => ({
            file,
            key: getFileKey(file),
            hash: await hashFile(file),
          })),
        );

        if (cancelled) {
          return;
        }

        const uniqueHashes = Array.from(new Set(hashedFiles.map((entry) => entry.hash)));
        const response = await fetch("/api/import/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hashes: uniqueHashes }),
        });

        const payload = (await response.json()) as {
          matches?: DuplicateMatch[];
        };

        if (!response.ok) {
          throw new Error("Duplicate check failed.");
        }

        if (cancelled) {
          return;
        }

        const matchesByHash = new Map(
          (payload.matches ?? []).map((match) => [match.workbookHash, match]),
        );
        const seenHashes = new Set<string>();
        const nextMeta: Record<string, SelectedFileMeta> = {};

        for (const entry of hashedFiles) {
          const existingMatch = matchesByHash.get(entry.hash);

          if (existingMatch) {
            nextMeta[entry.key] = {
              status: "duplicate-existing",
              hash: entry.hash,
              duplicateMatch: existingMatch,
            };
            continue;
          }

          if (seenHashes.has(entry.hash)) {
            nextMeta[entry.key] = {
              status: "duplicate-selection",
              hash: entry.hash,
            };
            continue;
          }

          seenHashes.add(entry.hash);
          nextMeta[entry.key] = {
            status: "ready",
            hash: entry.hash,
          };
        }

        setSelectedFileMeta(nextMeta);

      } catch {
        if (cancelled) {
          return;
        }

        const nextMeta = Object.fromEntries(
          selectedFiles.map((file) => [
            getFileKey(file),
            { status: "error" as const },
          ]),
        );
        setSelectedFileMeta(nextMeta);
        setToast({
          tone: "info",
          message:
            "Hostlyx could not verify duplicate content right now, but you can still import the selected files.",
        });
      }
    }

    void inspectFiles();

    return () => {
      cancelled = true;
    };
  }, [selectedFiles]);

  const selectionSummary = useMemo(() => {
    let readyCount = 0;
    let unverifiableCount = 0;
    let duplicateExistingCount = 0;
    let duplicateSelectionCount = 0;
    let checkingCount = 0;

    for (const file of selectedFiles) {
      const meta = selectedFileMeta[getFileKey(file)];

      switch (meta?.status) {
        case "ready":
          readyCount += 1;
          break;
        case "error":
          unverifiableCount += 1;
          break;
        case "duplicate-existing":
          duplicateExistingCount += 1;
          break;
        case "duplicate-selection":
          duplicateSelectionCount += 1;
          break;
        case "checking":
          checkingCount += 1;
          break;
        default:
          break;
      }
    }

    return {
      readyCount,
      unverifiableCount,
      duplicateExistingCount,
      duplicateSelectionCount,
      checkingCount,
    };
  }, [selectedFileMeta, selectedFiles]);

  const importableFiles = selectedFiles.filter((file) => {
    const status = selectedFileMeta[getFileKey(file)]?.status;
    return status === "ready" || status === "error";
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setUploadState("error");
      setToast({
        tone: "error",
        message: "Choose at least one CSV or Excel file before importing.",
      });
      return;
    }

    if (selectionSummary.checkingCount > 0) {
      setUploadState("error");
      setToast({
        tone: "info",
        message: "Hostlyx is still checking the selected files for duplicate content.",
      });
      return;
    }

    if (importableFiles.length === 0) {
      setUploadState("error");
      setToast({
        tone: "error",
        message:
          "Every selected file is already imported or duplicated in this selection. Remove the repeated files or choose different exports.",
      });
      return;
    }

    if (!selectedPropertyName) {
      setUploadState("error");
      setToast({
        tone: "error",
        message: "Choose the property that this import belongs to.",
      });
      return;
    }

    setUploadState("uploading");
    setToast(null);

    try {
      const succeededFiles: File[] = [];
      const failedResults: Array<{ file: File; message: string }> = [];
      const importedResults: ImportedFileResult[] = [];
      const importedSummary: ImportedBatchSummary = {
        rowsImported: 0,
        bookingsImported: 0,
        payoutsDetected: 0,
        feesDetected: 0,
        skippedRows: 0,
      };
      let successMessage = "";

      for (const file of importableFiles) {
        const upload = new FormData();
        upload.append("files", file);
        upload.set("propertyName", selectedPropertyName);

        const response = await fetch("/api/import", {
          method: "POST",
          body: upload,
        });
        const { rawResponse, payload } = await parseImportResponse(response);

        if (!response.ok) {
          failedResults.push({
            file,
            message:
              payload.error ??
              (rawResponse.trim()
                ? `Import failed (${response.status}). ${rawResponse.trim().slice(0, 220)}`
                : `Import failed with status ${response.status}.`),
          });
          continue;
        }

        succeededFiles.push(file);
        if (payload.message) {
          successMessage = payload.message;
        }
        if (payload.imports?.length) {
          importedResults.push(...payload.imports);
        }
        if (payload.summary) {
          importedSummary.rowsImported += payload.summary.rowsImported;
          importedSummary.bookingsImported += payload.summary.bookingsImported;
          importedSummary.payoutsDetected += payload.summary.payoutsDetected;
          importedSummary.feesDetected += payload.summary.feesDetected;
          importedSummary.skippedRows += payload.summary.skippedRows;
        }
      }

      const failedKeys = new Set(failedResults.map((result) => getFileKey(result.file)));
      const remainingFiles = selectedFiles.filter((file) => failedKeys.has(getFileKey(file)));
      setSelectedFiles(remainingFiles);
      setSelectedFileMeta((current) => {
        const nextMeta: Record<string, SelectedFileMeta> = {};

        for (const file of remainingFiles) {
          const key = getFileKey(file);
          nextMeta[key] = current[key] ?? { status: "ready" };
        }

        return nextMeta;
      });
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      if (failedResults.length === 0) {
        setUploadState("success");
        setLastImportedBatch({
          propertyName: selectedPropertyName,
          imports: importedResults,
          summary: importedSummary,
        });
        setToast({
          tone: "success",
          message:
            successMessage ||
            (succeededFiles.length === 1
              ? `${succeededFiles[0].name} imported successfully.`
              : `${succeededFiles.length} files imported successfully into ${selectedPropertyName}.`),
        });
        if (refreshOnSuccess) {
          router.refresh();
        }
        onImportComplete?.({
          importedFilesCount: succeededFiles.length,
          propertyName: selectedPropertyName,
        });
        return;
      }

      setUploadState("error");
      if (succeededFiles.length > 0) {
        setLastImportedBatch({
          propertyName: selectedPropertyName,
          imports: importedResults,
          summary: importedSummary,
        });
      }
      const failurePreview = failedResults
        .slice(0, 2)
        .map((result) => `${result.file.name}: ${result.message}`)
        .join(" ");
      setToast({
        tone: "error",
        message:
          succeededFiles.length > 0
            ? `${succeededFiles.length} file${succeededFiles.length === 1 ? "" : "s"} imported, but ${failedResults.length} failed. ${failurePreview}`
            : `No files were imported. ${failurePreview}`,
      });
      if (succeededFiles.length > 0 && refreshOnSuccess) {
        router.refresh();
      }
      if (succeededFiles.length > 0) {
        onImportComplete?.({
          importedFilesCount: succeededFiles.length,
          propertyName: selectedPropertyName,
        });
      }
    } catch {
      setUploadState("error");
      setToast({
        tone: "error",
        message:
          "Import failed while processing the selected files. Try again, or import them in smaller batches.",
      });
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const incomingFiles = Array.from(event.target.files ?? []);
    handleIncomingFiles(incomingFiles);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
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
    setSelectedFileMeta((current) => {
      const nextMeta = { ...current };
      delete nextMeta[getFileKey(fileToRemove)];
      return nextMeta;
    });
    setLastImportedBatch(null);
    setUploadState("idle");
  }

  function clearSelectedFiles() {
    setSelectedFiles([]);
    setSelectedFileMeta({});
    setLastImportedBatch(null);
    setUploadState("idle");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleIncomingFiles(incomingFiles: File[]) {
    if (incomingFiles.length === 0) {
      return;
    }

    const nextFiles = mergeFiles(selectedFiles, incomingFiles);
    setSelectedFiles(nextFiles);
    setLastImportedBatch(null);
    setUploadState("idle");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      {toast ? (
        <div className="pointer-events-none fixed right-4 top-4 z-[70] w-full max-w-md sm:right-6 sm:top-6">
          <div
            className={`pointer-events-auto rounded-[24px] border px-4 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.32)] ${
              toast.tone === "success"
                ? "border-emerald-400/24 bg-[rgba(7,28,26,0.96)] text-emerald-100"
                : toast.tone === "error"
                  ? "border-rose-400/24 bg-[rgba(40,12,18,0.96)] text-rose-100"
                  : "border-[var(--workspace-border)] bg-[rgba(15,23,42,0.96)] text-[var(--workspace-text)]"
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              ) : toast.tone === "error" ? (
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <UploadCloud className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {toast.tone === "success"
                    ? "Import completed"
                    : toast.tone === "error"
                      ? "Import needs attention"
                      : "Import update"}
                </p>
                <p className="mt-1 text-sm leading-6 opacity-90">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded-full border border-white/10 p-2 transition hover:bg-white/5"
                aria-label="Dismiss import notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="workspace-card rounded-[30px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--workspace-muted)]">
            {title}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
            {subtitle}
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
          accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          multiple
          className="sr-only"
          onChange={handleFileChange}
        />

        <div
          className={`workspace-soft-card rounded-[22px] border border-dashed p-4 transition ${
            isDragging
              ? "border-[var(--workspace-accent)] bg-[rgba(125,211,197,0.08)]"
              : "border-[var(--workspace-border)]"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget === event.target) {
              setIsDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleIncomingFiles(Array.from(event.dataTransfer.files ?? []));
          }}
        >
          <div className="mb-4 space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Target property
            </span>
            {properties.length > 1 ? (
              <WorkspaceSelect
                value={selectedPropertyName}
                onChange={setSelectedPropertyName}
                options={properties.map((property) => ({
                  value: property.name,
                  label: property.name,
                  description:
                    property.units.length > 0
                      ? `${property.units.length} unit${property.units.length === 1 ? "" : "s"}`
                      : "Single-home property",
                }))}
                placeholder="Select a property"
              />
            ) : (
              <div className="rounded-[18px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] px-4 py-3 text-sm text-[var(--workspace-text)]">
                {selectedPropertyName}
              </div>
            )}
            <p className="text-xs text-[var(--workspace-muted)]">
              Imported bookings, payouts, and expenses will be assigned to this property, then managed inside Hostlyx like any other saved record.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="block text-sm font-medium text-[var(--workspace-text)]">
                Import files
              </span>
              <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                {selectedFiles.length > 0
                  ? selectionSummary.checkingCount > 0
                    ? `Checking ${selectionSummary.checkingCount} file${selectionSummary.checkingCount === 1 ? "" : "s"} for duplicate content...`
                    : selectionSummary.readyCount + selectionSummary.unverifiableCount === 1
                      ? selectionSummary.unverifiableCount === 1
                        ? "1 file ready to import without duplicate verification."
                        : "1 new file ready to import."
                      : `${selectionSummary.readyCount + selectionSummary.unverifiableCount} files ready to import.`
                  : "Drop Airbnb, Booking.com, or generic CSV/XLSX exports here."}
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
                      {selectedFiles.map((file) => {
                        const meta = selectedFileMeta[getFileKey(file)];

                        return (
                        <div
                          key={getFileKey(file)}
                          className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--workspace-border)] bg-white/[0.02] px-3 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[var(--workspace-text)]">
                              {file.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-xs text-[var(--workspace-muted)]">
                                {formatFileSize(file.size)}
                              </p>
                              {meta?.status === "checking" ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-[var(--workspace-muted)]">
                                  <LoaderCircle className="h-3 w-3 animate-spin" />
                                  Checking content
                                </span>
                              ) : null}
                              {meta?.status === "ready" ? (
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-medium text-emerald-200">
                                  Ready
                                </span>
                              ) : null}
                              {meta?.status === "duplicate-selection" ? (
                                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[11px] font-medium text-amber-200">
                                  Duplicate in this selection
                                </span>
                              ) : null}
                              {meta?.status === "duplicate-existing" ? (
                                <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-1 text-[11px] font-medium text-rose-200">
                                  Already imported by content
                                </span>
                              ) : null}
                              {meta?.status === "error" ? (
                                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[11px] font-medium text-amber-200">
                                  Could not verify, still importable
                                </span>
                              ) : null}
                            </div>
                            {meta?.status === "duplicate-existing" && meta.duplicateMatch ? (
                              <p className="mt-2 text-xs text-rose-100/85">
                                Matches {meta.duplicateMatch.fileName} in {meta.duplicateMatch.propertyName} • {formatImportedAt(meta.duplicateMatch.importedAt)}
                              </p>
                            ) : null}
                            {meta?.status === "duplicate-selection" ? (
                              <p className="mt-2 text-xs text-amber-100/85">
                                This file has the same content as another file in the current selection.
                              </p>
                            ) : null}
                            {meta?.status === "error" ? (
                              <p className="mt-2 text-xs text-amber-100/85">
                                Duplicate checking failed for this file, but Hostlyx can still try to import it.
                              </p>
                            ) : null}
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
                      )})}
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="truncate text-sm font-medium text-[var(--workspace-text)]">
                      No file selected yet
                    </p>
                    <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                      CSV and Excel files are supported. Hostlyx will detect Airbnb, Booking.com, or Generic Excel when possible.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {lastImportedBatch ? (
          <div className="workspace-soft-card rounded-[24px] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                  Import summary
                </p>
                <p className="mt-2 text-base font-medium text-[var(--workspace-text)]">
                  Data landed in {lastImportedBatch.propertyName}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  new Set(lastImportedBatch.imports.map((entry) => entry.sourceLabel)),
                ).map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-[var(--workspace-border)] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--workspace-text)]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Rows imported", lastImportedBatch.summary.rowsImported],
                ["Bookings imported", lastImportedBatch.summary.bookingsImported],
                ["Payouts detected", lastImportedBatch.summary.payoutsDetected],
                ["Fees detected", lastImportedBatch.summary.feesDetected],
                ["Skipped rows", lastImportedBatch.summary.skippedRows],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] px-4 py-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--workspace-text)]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {lastImportedBatch.imports.map((entry) => (
                <div
                  key={`${entry.fileName}-${entry.source}`}
                  className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-panel)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--workspace-text)]">
                        {entry.fileName}
                      </p>
                      <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                        Detected as {entry.sourceLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-[var(--workspace-muted)]">
                      <span>{entry.bookingsImported} bookings</span>
                      <span>{entry.payoutsDetected} payouts</span>
                      <span>{entry.feesDetected} fee rows</span>
                    </div>
                  </div>

                  {entry.warnings.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {entry.warnings.map((warning) => (
                        <div
                          key={`${entry.fileName}-${warning.code}`}
                          className="rounded-[16px] border border-amber-400/18 bg-amber-300/[0.06] px-3 py-3 text-sm text-amber-50/90"
                        >
                          {warning.message}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={
            uploadState === "uploading" ||
            selectedFiles.length === 0 ||
            selectionSummary.checkingCount > 0 ||
            importableFiles.length === 0
          }
          className="workspace-button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploadState === "uploading" ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Moving data into Hostlyx...
            </>
          ) : (
            `Import ${importableFiles.length || 0} new file${importableFiles.length === 1 ? "" : "s"} into Hostlyx`
          )}
        </button>
      </form>
      </div>
    </div>
  );
}
