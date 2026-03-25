import { NextResponse } from "next/server";
import { requireUserEmail } from "@/lib/auth";
import { insertManualBooking } from "@/lib/db";
import { normalizeManualBooking } from "@/lib/manual-entry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireUserEmail();

    if (!ownerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const booking = normalizeManualBooking(formData);
    await insertManualBooking({
      ownerEmail,
      booking,
    });

    return NextResponse.json({
      message: `Booking for ${booking.guestName} added successfully.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The booking could not be saved.",
      },
      { status: 400 },
    );
  }
}
