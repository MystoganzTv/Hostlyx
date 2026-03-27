import { NextResponse } from "next/server";
import { requireUserEmail } from "@/lib/auth";
import { updateSubscriptionPlan } from "@/lib/db";
import { normalizeSubscriptionPlan } from "@/lib/subscription";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireUserEmail();

    if (!ownerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as { plan?: string };
    const plan = normalizeSubscriptionPlan(payload.plan);

    if (plan === "trial") {
      return NextResponse.json(
        { error: "Choose a paid plan to continue." },
        { status: 400 },
      );
    }

    await updateSubscriptionPlan({
      ownerEmail,
      plan,
    });

    return NextResponse.json({
      message: `Updated subscription to ${plan}.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The subscription could not be updated.",
      },
      { status: 400 },
    );
  }
}
