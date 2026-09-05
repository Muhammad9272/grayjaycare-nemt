import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, driverAssignedEmail, tripCancelledEmail, tripStatusEmail } from "@/lib/email";
import { getActivePricingRule } from "@/lib/pricing";
import { databaseErrorResponse, readJsonBody } from "@/lib/http";
import { requestIp } from "@/lib/rateLimit";
import type { TripStatus, VehicleType } from "@/generated/prisma/client";

const DISPATCH_ROLES = ["SUPER_ADMIN", "ADMIN", "DISPATCHER"];
const ASSIGNABLE_STATUSES: TripStatus[] = ["PENDING", "QUOTED", "CONFIRMED", "ASSIGNED"];
const OPERATIONAL_STATUSES: TripStatus[] = ["ASSIGNED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"];

const DRIVER_ALLOWED_TRANSITIONS: Partial<Record<TripStatus, TripStatus[]>> = {
  ASSIGNED: ["EN_ROUTE"],
  EN_ROUTE: ["ARRIVED"],
  ARRIVED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
};

const DISPATCH_ALLOWED_TRANSITIONS: Partial<Record<TripStatus, TripStatus[]>> = {
  PENDING: ["QUOTED", "CONFIRMED", "ASSIGNED", "CANCELLED"],
  QUOTED: ["CONFIRMED", "ASSIGNED", "CANCELLED"],
  CONFIRMED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["EN_ROUTE", "CONFIRMED", "CANCELLED"],
  EN_ROUTE: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED"],
};

const RIDER_CANCELLABLE_STATUSES: TripStatus[] = ["PENDING", "QUOTED", "CONFIRMED", "ASSIGNED", "EN_ROUTE"];

const STATUS_LABELS: Partial<Record<TripStatus, string>> = {
  QUOTED: "Fare reviewed",
  CONFIRMED: "Booking confirmed",
  ASSIGNED: "Driver assigned",
  EN_ROUTE: "Driver en route",
  ARRIVED: "Driver arrived",
  IN_PROGRESS: "Trip in progress",
  COMPLETED: "Trip completed",
  NO_SHOW: "Passenger not available",
};

const patchSchema = z
  .object({
    driverId: z.string().min(1).nullable().optional(),
    vehicleId: z.string().min(1).nullable().optional(),
    status: z
      .enum([
        "PENDING",
        "QUOTED",
        "CONFIRMED",
        "ASSIGNED",
        "EN_ROUTE",
        "ARRIVED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
      ])
      .optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .refine((input) => input.driverId !== undefined || input.vehicleId !== undefined || input.status !== undefined, {
    message: "No trip change was provided.",
  });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = patchSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { driverId, vehicleId, status, note } = parsed.data;

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { customer: { include: { user: true } }, invoice: true },
  });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const isDispatch = DISPATCH_ROLES.includes(session.user.role);
  const isDriver = session.user.role === "DRIVER";
  const isCustomer = session.user.role === "CUSTOMER";
  const isHospital = session.user.role === "HOSPITAL";

  if (isDriver) {
    const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
    if (
      !driver ||
      driver.verificationStatus !== "APPROVED" ||
      driver.licenseExpiry <= new Date() ||
      trip.driverId !== driver.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (driverId !== undefined || vehicleId !== undefined || !status) {
      return NextResponse.json({ error: "Drivers can only advance the status of their assigned trips." }, { status: 403 });
    }
    if (!(DRIVER_ALLOWED_TRANSITIONS[trip.status] ?? []).includes(status)) {
      return NextResponse.json({ error: `Cannot move trip from ${trip.status} to ${status}.` }, { status: 400 });
    }
  } else if (isCustomer || isHospital) {
    if (isCustomer) {
      const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
      if (!customer || trip.customerId !== customer.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else {
      const hospital = await prisma.hospitalAccount.findFirst({ where: { primaryContactId: session.user.id } });
      if (!hospital || trip.hospitalId !== hospital.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (driverId !== undefined || vehicleId !== undefined || status !== "CANCELLED") {
      return NextResponse.json({ error: "You can only cancel your own active trips." }, { status: 403 });
    }
    if (!RIDER_CANCELLABLE_STATUSES.includes(trip.status)) {
      return NextResponse.json({ error: `Trip can no longer be cancelled (status: ${trip.status}).` }, { status: 400 });
    }
  } else if (!isDispatch) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isDispatch && status && status !== trip.status && !(DISPATCH_ALLOWED_TRANSITIONS[trip.status] ?? []).includes(status)) {
    return NextResponse.json({ error: `Cannot move trip from ${trip.status} to ${status}.` }, { status: 400 });
  }
  const assignmentChanged = driverId !== undefined || vehicleId !== undefined;
  if (assignmentChanged && !isDispatch) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (assignmentChanged && !ASSIGNABLE_STATUSES.includes(trip.status)) {
    return NextResponse.json({ error: `Assignments cannot be changed while a trip is ${trip.status}.` }, { status: 400 });
  }

  const nextDriverId = driverId !== undefined ? driverId : trip.driverId;
  const nextVehicleId = vehicleId !== undefined ? vehicleId : trip.vehicleId;
  const driver = nextDriverId
    ? await prisma.driver.findUnique({ where: { id: nextDriverId }, include: { user: true } })
    : null;
  const vehicle = nextVehicleId ? await prisma.vehicle.findUnique({ where: { id: nextVehicleId } }) : null;

  if (nextDriverId && (!driver || driver.verificationStatus !== "APPROVED" || driver.licenseExpiry <= new Date() || !driver.user.isActive)) {
    return NextResponse.json({ error: "Only an active, approved driver with a valid licence can be assigned." }, { status: 400 });
  }
  if (nextVehicleId && (!vehicle || vehicle.status !== "ACTIVE")) {
    return NextResponse.json({ error: "Only an active vehicle can be assigned." }, { status: 400 });
  }
  if (vehicle && !vehicleSupportsTrip(vehicle.type, trip.mobilityType)) {
    return NextResponse.json({ error: `A ${vehicle.type.toLowerCase().replaceAll("_", " ")} cannot support a ${trip.mobilityType.toLowerCase()} trip.` }, { status: 400 });
  }

  let nextStatus = status ?? trip.status;
  if (assignmentChanged && !status) {
    if (nextDriverId && nextVehicleId) nextStatus = "ASSIGNED";
    else if (trip.status === "ASSIGNED") nextStatus = "CONFIRMED";
  }
  if (OPERATIONAL_STATUSES.includes(nextStatus) && (!nextDriverId || !nextVehicleId)) {
    return NextResponse.json({ error: `${nextStatus} requires both a driver and a vehicle.` }, { status: 400 });
  }

  const recipientEmail = trip.guestEmail ?? trip.customer?.user.email ?? null;
  let lateCancellationFeeApplies = false;
  let lateCancellationFee = 0;
  let billableTotal: number | null = null;
  const data: {
    driverId?: string | null;
    vehicleId?: string | null;
    status?: TripStatus;
    assignedAt?: Date | null;
    cancelledAt?: Date;
    cancellationReason?: string | null;
    dispatchedById?: string;
    finalFare?: number;
  } = {};

  if (driverId !== undefined) data.driverId = driverId;
  if (vehicleId !== undefined) data.vehicleId = vehicleId;
  if (nextStatus !== trip.status) data.status = nextStatus;
  if (nextStatus === "ASSIGNED" && trip.status !== "ASSIGNED") data.assignedAt = new Date();
  if (nextStatus === "CONFIRMED" && trip.status === "ASSIGNED") data.assignedAt = null;
  if (isDispatch && assignmentChanged) data.dispatchedById = session.user.id;

  let pricingRule: Awaited<ReturnType<typeof getActivePricingRule>> | null = null;
  if (nextStatus === "CANCELLED" || nextStatus === "NO_SHOW" || nextStatus === "COMPLETED") {
    pricingRule = await getActivePricingRule();
  }
  if (nextStatus === "CANCELLED") {
    data.cancelledAt = new Date();
    const hoursUntilTrip = (trip.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
    lateCancellationFeeApplies = hoursUntilTrip < Number(pricingRule!.cancellationWindowHours);
    lateCancellationFee = Number(pricingRule!.lateCancellationFee);
    data.cancellationReason = lateCancellationFeeApplies
      ? `${note ?? "Cancelled"} (late cancellation — $${lateCancellationFee.toFixed(2)} fee applies, less than ${pricingRule!.cancellationWindowHours}h notice)`
      : note ?? null;
    if (lateCancellationFeeApplies) {
      data.finalFare = lateCancellationFee;
      billableTotal = lateCancellationFee;
    }
  } else if (nextStatus === "NO_SHOW") {
    billableTotal = Number(pricingRule!.lateCancellationFee);
    data.finalFare = billableTotal;
  } else if (nextStatus === "COMPLETED") {
    billableTotal = Number(trip.finalFare ?? trip.estimatedFare ?? 0);
    data.finalFare = billableTotal;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.trip.update({
        where: { id },
        data: {
          ...data,
          ...(nextStatus !== trip.status ? { statusEvents: { create: { status: nextStatus, note } } } : {}),
        },
        include: {
          driver: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
          vehicle: true,
        },
      });

      if (billableTotal != null && billableTotal > 0 && !trip.invoice) {
        const taxRate = Number(pricingRule?.taxRatePct ?? 0) / 100;
        const subtotal = Math.round((billableTotal / (1 + taxRate)) * 100) / 100;
        const taxAmount = Math.round((billableTotal - subtotal) * 100) / 100;
        await tx.invoice.create({
          data: {
            invoiceNumber: `INV-${trip.referenceCode.replace(/^GJC-/, "")}`,
            tripId: trip.id,
            status: "DRAFT",
            subtotal,
            taxAmount,
            total: billableTotal,
            dueDate: trip.hospitalId ? new Date(Date.now() + 30 * 24 * 60 * 60_000) : null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: assignmentChanged ? "trip.assignment_update" : `trip.${nextStatus.toLowerCase()}`,
          entity: "Trip",
          entityId: trip.id,
          metadata: { fromStatus: trip.status, toStatus: nextStatus, driverId: nextDriverId, vehicleId: nextVehicleId },
          ipAddress: requestIp(request),
        },
      });
      return changed;
    });

    if (recipientEmail && nextStatus !== trip.status) {
      const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;
      const portalUrl = new URL(`/trips/${updated.id}`, baseUrl).toString();
      if (nextStatus === "ASSIGNED" && updated.driver) {
        await sendEmail({
          to: recipientEmail,
          ...driverAssignedEmail({
            referenceCode: updated.referenceCode,
            driverName: `${updated.driver.user.firstName} ${updated.driver.user.lastName}`,
            scheduledAt: updated.scheduledAt,
            portalUrl,
          }),
        });
      } else if (nextStatus === "CANCELLED") {
        await sendEmail({
          to: recipientEmail,
          ...tripCancelledEmail({
            referenceCode: updated.referenceCode,
            reason: data.cancellationReason ?? note ?? null,
            portalUrl,
          }),
        });
      } else if (STATUS_LABELS[nextStatus]) {
        await sendEmail({
          to: recipientEmail,
          ...tripStatusEmail({ referenceCode: updated.referenceCode, statusLabel: STATUS_LABELS[nextStatus]!, note, portalUrl }),
        });
      }
    }

    return NextResponse.json({ trip: updated, lateCancellationFeeApplies, lateCancellationFee });
  } catch (error) {
    return databaseErrorResponse(error, "The trip could not be updated.");
  }
}

function vehicleSupportsTrip(vehicleType: VehicleType, mobilityType: "AMBULATORY" | "WHEELCHAIR" | "STRETCHER"): boolean {
  if (mobilityType === "STRETCHER") return vehicleType === "STRETCHER_VAN";
  if (mobilityType === "WHEELCHAIR") return vehicleType === "WHEELCHAIR_VAN" || vehicleType === "STRETCHER_VAN";
  return true;
}
