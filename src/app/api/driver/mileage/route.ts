import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mileageSchema } from "@/lib/validation/driver";
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
  const parsed = mileageSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.endKm <= parsed.data.startKm) {
    return NextResponse.json({ error: "End odometer must be greater than start odometer." }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: driver.assignedVehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Assigned vehicle was not found." }, { status: 404 });
  if (parsed.data.startKm < vehicle.odometerKm) {
    return NextResponse.json({ error: `Start odometer cannot be below the current ${vehicle.odometerKm} km.` }, { status: 400 });
  }
  if (parsed.data.tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: parsed.data.tripId }, select: { driverId: true, vehicleId: true } });
    if (!trip || trip.driverId !== driver.id || trip.vehicleId !== driver.assignedVehicleId) {
      return NextResponse.json({ error: "Mileage can only be linked to your own trip and assigned vehicle." }, { status: 403 });
    }
  }

  try {
    const [log] = await prisma.$transaction([
      prisma.mileageLog.create({
        data: {
          vehicleId: driver.assignedVehicleId,
          driverId: driver.id,
          startKm: parsed.data.startKm,
          endKm: parsed.data.endKm,
          tripId: parsed.data.tripId,
        },
      }),
      prisma.vehicle.update({ where: { id: driver.assignedVehicleId }, data: { odometerKm: parsed.data.endKm } }),
      prisma.auditLog.create({
        data: { userId: session.user.id, action: "vehicle.mileage", entity: "Vehicle", entityId: driver.assignedVehicleId, metadata: { startKm: parsed.data.startKm, endKm: parsed.data.endKm } },
      }),
    ]);
    return NextResponse.json({ log });
  } catch (error) {
    return databaseErrorResponse(error, "The mileage log could not be recorded.");
  }
}
