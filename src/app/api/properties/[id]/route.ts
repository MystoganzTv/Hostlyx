import { NextResponse } from "next/server";
import { requireUserEmail } from "@/lib/auth";
import { deletePropertyDefinition, updatePropertyDefinition } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ownerEmail = await requireUserEmail();

    if (!ownerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const propertyId = Number((await params).id);

    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
    }

    const formData = await request.formData();
    const propertyName = String(formData.get("name") ?? "").trim();

    await updatePropertyDefinition({
      ownerEmail,
      propertyId,
      name: propertyName,
    });

    return NextResponse.json({
      message: `Property renamed to "${propertyName}".`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "The property could not be updated.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ownerEmail = await requireUserEmail();

    if (!ownerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const propertyId = Number((await params).id);

    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
    }

    await deletePropertyDefinition({
      ownerEmail,
      propertyId,
    });

    return NextResponse.json({
      message: "Property deleted successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "The property could not be deleted.",
      },
      { status: 400 },
    );
  }
}
