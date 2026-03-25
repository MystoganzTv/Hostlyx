import { NextResponse } from "next/server";
import { requireUserEmail } from "@/lib/auth";
import { replaceImportData } from "@/lib/db";
import { parseWorkbook } from "@/lib/workbook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireUserEmail();

    if (!ownerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Attach a valid .xlsx file to import." },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Only .xlsx workbooks are supported." },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const { bookings, expenses } = parseWorkbook(buffer);

    const result = await replaceImportData({
      ownerEmail,
      fileName: file.name,
      source: "upload",
      bookings,
      expenses,
    });

    return NextResponse.json({
      message: `Imported ${result.bookingsCount} bookings and ${result.expensesCount} expenses from ${file.name}.`,
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
