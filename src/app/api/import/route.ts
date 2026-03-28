import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUserEmail } from "@/lib/auth";
import {
  appendImportData,
  getImportedWorkbookMatches,
  getPropertyDefinitions,
} from "@/lib/db";
import { getImportedSourceLabel, parseImportFile } from "@/lib/workbook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireUserEmail();

    if (!ownerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const propertyDefinitions = await getPropertyDefinitions(ownerEmail);

    if (propertyDefinitions.length === 0) {
      return NextResponse.json(
        { error: "Create your first property before importing a workbook." },
        { status: 400 },
      );
    }

    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);
    const fallbackFile = formData.get("file");
    const requestedPropertyName = String(formData.get("propertyName") ?? "").trim();
    const workbookFiles =
      files.length > 0
        ? files
        : fallbackFile instanceof File && fallbackFile.size > 0
          ? [fallbackFile]
          : [];

    if (workbookFiles.length === 0) {
      return NextResponse.json(
        { error: "Attach a valid CSV or Excel file to import." },
        { status: 400 },
      );
    }

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

    let totalBookings = 0;
    let totalExpenses = 0;
    let totalClosures = 0;
    let totalSkippedBookings = 0;
    let totalSkippedExpenses = 0;
    let totalSkippedClosures = 0;
    let totalSkippedWorkbooks = 0;
    const importedFiles: string[] = [];
    const importDetails: Array<{
      fileName: string;
      source: string;
      sourceLabel: string;
      rowsImported: number;
      bookingsImported: number;
      payoutsDetected: number;
      feesDetected: number;
      skippedRows: number;
      warnings: Array<{ code: string; message: string }>;
    }> = [];
    const seenWorkbookHashes = new Set<string>();

    for (const file of workbookFiles) {
      if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
        return NextResponse.json(
          { error: `Only CSV or Excel files are supported. "${file.name}" is not valid.` },
          { status: 400 },
        );
      }

      const buffer = await file.arrayBuffer();
      const workbookHash = createHash("sha256")
        .update(Buffer.from(buffer))
        .digest("hex");

      if (seenWorkbookHashes.has(workbookHash)) {
        totalSkippedWorkbooks += 1;
        continue;
      }

      seenWorkbookHashes.add(workbookHash);
      const existingMatches = await getImportedWorkbookMatches(ownerEmail, [workbookHash]);

      if (existingMatches.length > 0) {
        totalSkippedWorkbooks += 1;
        continue;
      }

      const parsedImport = parseImportFile(buffer, file.name);

      const result = await appendImportData({
        ownerEmail,
        fileName: file.name,
        workbookHash,
        propertyName: targetPropertyName,
        source: "upload",
        importedSource: parsedImport.importedSource,
        bookings: parsedImport.bookings.map((booking) => ({
          ...booking,
          propertyName: targetPropertyName,
        })),
        expenses: parsedImport.expenses.map((expense) => ({
          ...expense,
          propertyName: targetPropertyName,
        })),
        closures: parsedImport.closures.map((closure) => ({
          ...closure,
          propertyName: targetPropertyName,
        })),
      });

      totalBookings += result.bookingsCount;
      totalExpenses += result.expensesCount;
      totalClosures += result.closuresCount;
      totalSkippedBookings += result.skippedBookingsCount;
      totalSkippedExpenses += result.skippedExpensesCount;
      totalSkippedClosures += result.skippedClosuresCount;
      importedFiles.push(file.name);
      importDetails.push({
        fileName: file.name,
        source: parsedImport.importedSource,
        sourceLabel:
          parsedImport.summary.sourceLabel || getImportedSourceLabel(parsedImport.importedSource),
        rowsImported: parsedImport.summary.rowsImported,
        bookingsImported: parsedImport.summary.bookingsImported,
        payoutsDetected: parsedImport.summary.payoutsDetected,
        feesDetected: parsedImport.summary.feesDetected,
        skippedRows: parsedImport.summary.skippedRows,
        warnings: parsedImport.summary.warnings,
      });
    }

    const duplicateNotice =
      totalSkippedBookings > 0 ||
      totalSkippedExpenses > 0 ||
      totalSkippedClosures > 0 ||
      totalSkippedWorkbooks > 0
        ? ` Skipped ${totalSkippedWorkbooks} duplicate files, ${totalSkippedBookings} duplicate bookings, ${totalSkippedExpenses} duplicate expenses, and ${totalSkippedClosures} duplicate closed-day records already saved in Hostlyx.`
        : "";
    const fileLabel =
      importedFiles.length === 1
        ? importedFiles[0]
        : `${importedFiles.length} files`;

    if (importedFiles.length === 0 && totalSkippedWorkbooks > 0) {
      return NextResponse.json({
        message: `No new files were imported. Hostlyx recognized ${totalSkippedWorkbooks} selected file${totalSkippedWorkbooks === 1 ? "" : "s"} as already saved by content, so nothing new was added.`,
      });
    }

    return NextResponse.json({
      message: `Added ${totalBookings} bookings, ${totalExpenses} expenses, and ${totalClosures} closed-day records from ${fileLabel} into ${targetPropertyName}. The records now live inside Hostlyx and the upload stays in Import History.${duplicateNotice}`,
      imports: importDetails,
      summary: {
        rowsImported: importDetails.reduce((sum, entry) => sum + entry.rowsImported, 0),
        bookingsImported: importDetails.reduce(
          (sum, entry) => sum + entry.bookingsImported,
          0,
        ),
        payoutsDetected: importDetails.reduce(
          (sum, entry) => sum + entry.payoutsDetected,
          0,
        ),
        feesDetected: importDetails.reduce((sum, entry) => sum + entry.feesDetected, 0),
        skippedRows:
          importDetails.reduce((sum, entry) => sum + entry.skippedRows, 0) +
          totalSkippedBookings +
          totalSkippedExpenses +
          totalSkippedClosures,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The file could not be imported.",
      },
      { status: 400 },
    );
  }
}
