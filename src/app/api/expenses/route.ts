import { NextResponse } from "next/server";
import { requireUserEmail } from "@/lib/auth";
import { insertManualExpense } from "@/lib/db";
import { normalizeManualExpense } from "@/lib/manual-entry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireUserEmail();

    if (!ownerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const expense = normalizeManualExpense(formData);
    await insertManualExpense({
      ownerEmail,
      expense,
    });

    return NextResponse.json({
      message: `Expense "${expense.description}" added successfully.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The expense could not be saved.",
      },
      { status: 400 },
    );
  }
}
