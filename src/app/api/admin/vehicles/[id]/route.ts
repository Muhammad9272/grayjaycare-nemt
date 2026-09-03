import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateVehicleStatusSchema } from "@/lib/validation/admin";
import { databaseErrorResponse, readJsonBody } from "@/lib/http";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = updateVehicleStatusSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.status !== "ACTIVE") {
    const activeTrip = await prisma.trip.findFirst({
      where: { vehicleId: id, status: { in: ["ASSIGNED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"] } },
      select: { referenceCode: true },
    });
    if (activeTrip) {
      return NextResponse.json(
        { error: `Vehicle is assigned to active trip ${activeTrip.referenceCode}. Reassign that trip first.` },
        { status: 409 },
      );
    }
  }

  try {
    const [vehicle] = await prisma.$transaction([
      prisma.vehicle.update({ where: { id }, data: { status: parsed.data.status } }),
      prisma.auditLog.create({
        data: { userId: session.user.id, action: "vehicle.status_update", entity: "Vehicle", entityId: id, metadata: { status: parsed.data.status } },
      }),
    ]);
    return NextResponse.json({ vehicle });
  } catch (error) {
    return databaseErrorResponse(error, "The vehicle status could not be updated.");
  }
}
