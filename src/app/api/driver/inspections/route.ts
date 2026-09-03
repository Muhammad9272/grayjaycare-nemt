import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inspectionSchema } from "@/lib/validation/driver";
import { databaseErrorResponse, readJsonBody } from "@/lib/http";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver || driver.verificationStatus !== "APPROVED" || driver.licenseExpiry <= new Date()) {
    return NextResponse.json({ error: "Your driver account is not approved or the licence has expired." }, { status: 403 });
  }
  if (!driver.assignedVehicleId) {
    return NextResponse.json({ error: "No vehicle assigned to your account." }, { status: 400 });
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = inspectionSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const vehicle = await prisma.vehicle.findUnique({ where: { id: driver.assignedVehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Assigned vehicle was not found." }, { status: 404 });
  if (parsed.data.odometerKm < vehicle.odometerKm) {
    return NextResponse.json({ error: `Odometer cannot be below the current ${vehicle.odometerKm} km.` }, { status: 400 });
  }

  try {
    const [inspection] = await prisma.$transaction([
      prisma.vehicleInspection.create({
        data: {
          vehicleId: driver.assignedVehicleId,
          driverId: driver.id,
          passed: parsed.data.passed,
          notes: parsed.data.notes,
          odometerKm: parsed.data.odometerKm,
        },
      }),
      prisma.vehicle.update({
        where: { id: driver.assignedVehicleId },
        data: {
          odometerKm: parsed.data.odometerKm,
          ...(!parsed.data.passed ? { status: "MAINTENANCE" as const } : {}),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "vehicle.inspection",
          entity: "Vehicle",
          entityId: driver.assignedVehicleId,
          metadata: { passed: parsed.data.passed, odometerKm: parsed.data.odometerKm },
        },
      }),
    ]);
    return NextResponse.json({ inspection });
  } catch (error) {
    return databaseErrorResponse(error, "The inspection could not be recorded.");
  }
}
