import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVehicleSchema } from "@/lib/validation/admin";
import { databaseErrorResponse, readJsonBody } from "@/lib/http";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = createVehicleSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  const existing = await prisma.vehicle.findUnique({ where: { plateNumber: input.plateNumber } });
  if (existing) return NextResponse.json({ error: "A vehicle with this plate number already exists." }, { status: 409 });

  try {
    const [vehicle] = await prisma.$transaction([
      prisma.vehicle.create({ data: input }),
      prisma.auditLog.create({
        data: { userId: session.user.id, action: "vehicle.create", entity: "Vehicle", metadata: { plateNumber: input.plateNumber } },
      }),
    ]);

    return NextResponse.json({ vehicle });
  } catch (error) {
    return databaseErrorResponse(error, "The vehicle could not be created.");
  }
}
