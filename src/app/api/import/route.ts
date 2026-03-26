import { NextResponse } from "next/server";
import { requireUserEmail } from "@/lib/auth";
import { appendImportData, getPropertyDefinitions } from "@/lib/db";
import { parseWorkbook } from "@/lib/workbook";

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
        { error: "Attach a valid .xlsx file to import." },
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
    let totalSkippedBookings = 0;
    let totalSkippedExpenses = 0;
    const importedFiles: string[] = [];

    for (const file of workbookFiles) {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        return NextResponse.json(
          { error: `Only .xlsx workbooks are supported. "${file.name}" is not valid.` },
          { status: 400 },
        );
      }

      const buffer = await file.arrayBuffer();
      const { bookings, expenses } = parseWorkbook(buffer);

      const result = await appendImportData({
        ownerEmail,
        fileName: file.name,
        propertyName: targetPropertyName,
        source: "upload",
        bookings: bookings.map((booking) => ({
          ...booking,
          propertyName: targetPropertyName,
          unitName: "",
        })),
        expenses: expenses.map((expense) => ({
          ...expense,
          propertyName: targetPropertyName,
          unitName: "",
        })),
      });

      totalBookings += result.bookingsCount;
      totalExpenses += result.expensesCount;
      totalSkippedBookings += result.skippedBookingsCount;
      totalSkippedExpenses += result.skippedExpensesCount;
      importedFiles.push(file.name);
    }

    const duplicateNotice =
      totalSkippedBookings > 0 || totalSkippedExpenses > 0
        ? ` Skipped ${totalSkippedBookings} duplicate bookings and ${totalSkippedExpenses} duplicate expenses already saved in Hostlyx.`
        : "";
    const fileLabel =
      importedFiles.length === 1
        ? importedFiles[0]
        : `${importedFiles.length} workbooks`;

    return NextResponse.json({
      message: `Added ${totalBookings} bookings and ${totalExpenses} expenses from ${fileLabel} into ${targetPropertyName}. The records now live inside Hostlyx and the upload stays in Import History.${duplicateNotice}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The workbook could not be imported.",
      },
      { status: 400 },
    );
  }
}
