import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUserEmail } from "@/lib/auth";
import { appendImportData, getBookings, getPropertyDefinitions } from "@/lib/db";
import { buildImportPreview, mapPreviewToHostlyxRecords } from "@/lib/import/importPipeline";
import type { ImportManualMapping } from "@/lib/import/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireUserEmail();

    if (!ownerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const action = String(formData.get("action") ?? "preview").trim().toLowerCase();
    const fileValue = formData.get("file");
    const manualMappingValue = formData.get("manualMapping");

    if (!(fileValue instanceof File) || fileValue.size <= 0) {
      return NextResponse.json(
        { error: "Attach a valid Airbnb, Booking.com, or Hostlyx file first." },
        { status: 400 },
      );
    }

    if (!/\.(csv|xlsx|xls)$/i.test(fileValue.name)) {
      return NextResponse.json(
        { error: "Only CSV or Excel files are supported for import preview." },
        { status: 400 },
      );
    }

    const buffer = await fileValue.arrayBuffer();
    const existingBookings = await getBookings(ownerEmail);
    let manualMapping: ImportManualMapping | null = null;

    if (typeof manualMappingValue === "string" && manualMappingValue.trim()) {
      try {
        manualMapping = JSON.parse(manualMappingValue) as ImportManualMapping;
      } catch {
        return NextResponse.json(
          { error: "Hostlyx could not read the manual column mapping." },
          { status: 400 },
        );
      }
    }

    const preview = buildImportPreview(buffer, fileValue.name, existingBookings, {
      manualMapping,
    });

    if (action !== "commit") {
      return NextResponse.json({
        preview: {
          source: preview.source,
          sourceLabel: preview.sourceLabel,
          fileName: preview.fileName,
          requiresManualMapping: preview.requiresManualMapping,
          manualMapping: preview.manualMapping,
          totalRowsRead: preview.totalRowsRead,
          validRows: preview.validRows,
          warningRows: preview.warningRows,
          duplicateRows: preview.duplicateRows,
          errorRows: preview.errorRows,
          skippedRows: preview.skippedRows,
          expensesDetected: preview.expensesDetected,
          importableRows: preview.importableRows,
          previewRows: preview.previewRows,
          reviewRows: preview.reviewRows,
          warnings: preview.warnings,
          duplicates: preview.duplicates,
          canImport: preview.canImport,
        },
      });
    }

    if (!preview.canImport) {
      return NextResponse.json(
        {
          error: preview.requiresManualMapping
            ? "We couldn’t fully recognize your file. Map your columns in a few seconds to continue."
            : "This file needs attention before Hostlyx can import it.",
        },
        { status: 400 },
      );
    }

    const duplicateStrategy =
      String(formData.get("duplicateStrategy") ?? "skip").trim().toLowerCase() === "import"
        ? "import"
        : "skip";

    const propertyDefinitions = await getPropertyDefinitions(ownerEmail);

    if (propertyDefinitions.length === 0) {
      return NextResponse.json(
        { error: "Create your first property before importing data." },
        { status: 400 },
      );
    }

    const requestedPropertyName = String(formData.get("propertyName") ?? "").trim();
    const targetPropertyName = requestedPropertyName || propertyDefinitions[0]?.name || "";

    if (
      !targetPropertyName ||
      !propertyDefinitions.some(
        (property) => property.name.toLowerCase() === targetPropertyName.toLowerCase(),
      )
    ) {
      return NextResponse.json(
        { error: "Choose a valid property for this import." },
        { status: 400 },
      );
    }

    const workbookHash = createHash("sha256")
      .update(Buffer.from(buffer))
      .digest("hex");
    const mapped = mapPreviewToHostlyxRecords(preview, targetPropertyName, {
      duplicateStrategy,
    });

    if (mapped.bookings.length === 0 && mapped.expenses.length === 0) {
      return NextResponse.json(
        {
          error:
            duplicateStrategy === "skip"
              ? "Everything in this file is currently blocked or marked as duplicate. Review the preview or allow duplicates before importing."
              : "This file still needs attention before Hostlyx can import it.",
        },
        { status: 400 },
      );
    }

    const result = await appendImportData({
      ownerEmail,
      fileName: fileValue.name,
      workbookHash,
      propertyName: targetPropertyName,
      source: "upload",
      importedSource: mapped.importedSource,
      bookings: mapped.bookings,
      expenses: mapped.expenses,
      closures: [],
      allowDuplicateBookings: duplicateStrategy === "import",
    });

    return NextResponse.json({
      message: `Imported ${result.bookingsCount} bookings and ${result.expensesCount} expenses into ${targetPropertyName}.`,
      committed: {
        source: preview.source,
        sourceLabel: preview.sourceLabel,
        bookingsImported: result.bookingsCount,
        expensesImported: result.expensesCount,
        skippedRows: preview.skippedRows + (duplicateStrategy === "skip" ? preview.duplicateRows : 0),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "The file could not be processed.",
      },
      { status: 400 },
    );
  }
}
