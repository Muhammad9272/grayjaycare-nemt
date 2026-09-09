import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingSchema } from "@/lib/validation/booking";
import { getActivePricingRule, computeFare, type FareBreakdown } from "@/lib/pricing";
import { generateReferenceCode } from "@/lib/reference";
import { sendEmail, bookingConfirmationEmail, customerAccountEmail, operationsBookingEmail } from "@/lib/email";
import { auth } from "@/lib/auth";
import { createBookingAccessToken, createPasswordResetToken } from "@/lib/accountTokens";
import type { BookingSource, MobilityType } from "@/generated/prisma/client";
import { databaseErrorResponse, readJsonBody } from "@/lib/http";
import { getDistance } from "@/lib/googleMaps";
import { requestIp, withinRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = bookingSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  const returnTripType = input.returnTripType ?? (input.isRoundTrip ? "SCHEDULED_RETURN" : "ONE_WAY");
  const hasReturnLeg = returnTripType === "SCHEDULED_RETURN" || returnTripType === "WAIT_AND_RETURN";
  if (hasReturnLeg && !input.returnScheduledAt) {
    return NextResponse.json(
      { error: "Return trip date and time are required for this return option." },
      { status: 400 },
    );
  }

  const session = await auth();
  const isDispatchStaff = Boolean(
    session?.user && ["SUPER_ADMIN", "ADMIN", "DISPATCHER"].includes(session.user.role),
  );
  const hospitalId = session?.user.role === "HOSPITAL" ? await getHospitalId(session.user.id) : null;
  if (session?.user.role === "HOSPITAL" && !hospitalId) {
    return NextResponse.json({ error: "No hospital account is linked to this login." }, { status: 403 });
  }
  const source: BookingSource = hospitalId
    ? "HOSPITAL_PORTAL"
    : isDispatchStaff && input.source === "PHONE"
      ? "PHONE"
      : "WEBSITE";

  const normalizedEmail = input.guestEmail.trim().toLowerCase();
  if (!session?.user && !withinRateLimit(`booking:create:${requestIp(request)}:${normalizedEmail}`, 8, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many booking attempts. Please call us if you need immediate assistance." }, { status: 429 });
  }
  const shouldProvisionAccount = !session?.user && source === "WEBSITE";
  const generatedPasswordHash = shouldProvisionAccount
    ? await bcrypt.hash(randomBytes(32).toString("base64url"), 12)
    : null;

  const [rule, outboundGoogleDistance, returnGoogleDistance] = await Promise.all([
    getActivePricingRule(),
    getDistance(input.pickupAddress, input.dropoffAddress),
    hasReturnLeg ? getDistance(input.dropoffAddress, input.pickupAddress) : Promise.resolve(null),
  ]);
  const outboundDistanceKm = outboundGoogleDistance
    ? Math.round(outboundGoogleDistance.distanceKm * 10) / 10
    : input.distanceKm;
  if (!outboundDistanceKm) {
    return NextResponse.json(
      { error: "We could not verify the route distance. Please confirm both addresses or call (519) 933-5090." },
      { status: 400 },
    );
  }
  const returnDistanceKm = hasReturnLeg
    ? returnGoogleDistance
      ? Math.round(returnGoogleDistance.distanceKm * 10) / 10
      : input.returnDistanceKm ?? outboundDistanceKm
    : null;
  const isOutOfCity = source === "WEBSITE"
    ? ![input.pickupAddress, input.dropoffAddress].every((address) => /\blondon\b/i.test(address))
    : input.isOutOfCity;
  const oxygenRequirement = input.oxygenRequirement === "NO" && input.requiresOxygen ? "YES" : input.oxygenRequirement;
  const isolationRequirement = input.isolationRequirement === "NO" && input.requiresIsolation ? "YES" : input.isolationRequirement;
  const dnrRequirement = input.dnrRequirement === "NO" && input.hasDnr ? "YES" : input.dnrRequirement;
  const fareInputBase = {
    mobilityType: input.mobilityType as MobilityType,
    isBariatric: input.isBariatric,
    isOutOfCity,
    requiresOxygen: oxygenRequirement === "YES",
    extraAttendant: input.extraAttendant,
    extraAttendantHours: input.extraAttendantHours,
  };
  const outboundBreakdown = computeFare(rule, {
    ...fareInputBase,
    distanceKm: outboundDistanceKm,
    waitMinutes: input.waitMinutes,
    scheduledAt: input.scheduledAt,
    isReturnLeg: false,
  });

  let returnBreakdown: FareBreakdown | null = null;
  if (hasReturnLeg && input.returnScheduledAt && returnDistanceKm) {
    returnBreakdown = computeFare(rule, {
      ...fareInputBase,
      distanceKm: returnDistanceKm,
      waitMinutes: input.waitMinutes,
      scheduledAt: input.returnScheduledAt,
      isReturnLeg: true,
    });
  }

  const name = splitCustomerName(input.contactName ?? input.guestName);
  const roundTripGroupId = hasReturnLeg ? crypto.randomUUID() : null;

  let result: {
    outboundTrip: { id: string; referenceCode: string };
    returnTripId: string | null;
    accountCreated: boolean;
    accountUser: { id: string; email: string; firstName: string; passwordHash: string } | null;
    customerId: string | null;
  };
  try {
    result = await prisma.$transaction(async (tx) => {
    let customerId: string | null = null;
    let accountCreated = false;
    let accountUser: { id: string; email: string; firstName: string; passwordHash: string } | null = null;

    if (session?.user.role === "CUSTOMER") {
      const customer = await tx.customer.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      customerId = customer?.id ?? null;
    }

    if (!customerId) {
      const matchingUser = await tx.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          firstName: true,
          passwordHash: true,
          role: true,
          customerProfile: { select: { id: true } },
        },
      });

      if (matchingUser?.role === "CUSTOMER") {
        const customer = matchingUser.customerProfile
          ? matchingUser.customerProfile
          : await tx.customer.create({ data: { userId: matchingUser.id }, select: { id: true } });
        customerId = customer.id;
      } else if (!matchingUser && shouldProvisionAccount && generatedPasswordHash) {
        const newUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash: generatedPasswordHash,
            role: "CUSTOMER",
            firstName: name.firstName,
            lastName: name.lastName,
            phone: input.guestPhone,
            customerProfile: { create: {} },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            passwordHash: true,
            customerProfile: { select: { id: true } },
          },
        });
        customerId = newUser.customerProfile!.id;
        accountCreated = true;
        accountUser = newUser;
      }
    }

    const outboundTrip = await tx.trip.create({
      data: {
        referenceCode: generateReferenceCode(),
        source,
        status: "PENDING",
        customerId,
        hospitalId,
        bookedById: session?.user.id ?? null,
        guestName: input.guestName,
        guestEmail: normalizedEmail,
        guestPhone: input.guestPhone,
        contactName: input.contactName,
        contactPhoneExtension: input.contactPhoneExtension,
        medicalRecordNumber: input.medicalRecordNumber,
        pickupAddress: input.pickupAddress,
        pickupLat: input.pickupLat,
        pickupLng: input.pickupLng,
        pickupFacilityName: input.pickupFacilityName,
        pickupDepartment: input.pickupDepartment,
        pickupRoom: input.pickupRoom,
        dropoffAddress: input.dropoffAddress,
        dropoffLat: input.dropoffLat,
        dropoffLng: input.dropoffLng,
        dropoffFacilityName: input.dropoffFacilityName,
        dropoffDepartment: input.dropoffDepartment,
        dropoffRoom: input.dropoffRoom,
        scheduledAt: input.scheduledAt,
        pickupTimePreference: input.pickupTimePreference,
        returnTripType,
        mobilityType: input.mobilityType,
        isBariatric: input.isBariatric,
        isOutOfCity,
        passengerWeightKg: input.passengerWeightKg,
        requiresOxygen: oxygenRequirement === "YES",
        oxygenRequirement,
        oxygenLitresPerMinute: oxygenRequirement === "YES" ? input.oxygenLitresPerMinute : null,
        requiresIsolation: isolationRequirement === "YES",
        isolationRequirement,
        isolationDetails: isolationRequirement === "YES" ? input.isolationDetails : null,
        hasDnr: dnrRequirement === "YES",
        dnrRequirement,
        hasBelongings: input.hasBelongings,
        belongingsDescription: input.hasBelongings ? input.belongingsDescription : null,
        escortCount: input.escortCount,
        paymentPreference: input.paymentPreference,
        medicalDocumentsAvailable: input.medicalDocumentsAvailable,
        extraAttendant: input.extraAttendant,
        extraAttendantHours: input.extraAttendant ? input.extraAttendantHours : null,
        estimatedWaitMinutes: input.waitMinutes,
        notes: input.notes,
        distanceKm: outboundDistanceKm,
        estimatedFare: outboundBreakdown.total,
        roundTripGroupId,
        isReturnLeg: false,
        statusEvents: {
          create: { status: "PENDING", note: `Booking submitted (${source.toLowerCase().replaceAll("_", " ")})` },
        },
      },
    });

    let returnTripId: string | null = null;
    if (hasReturnLeg && input.returnScheduledAt && returnDistanceKm && returnBreakdown) {
      const returnTrip = await tx.trip.create({
        data: {
          referenceCode: generateReferenceCode(),
          source,
          status: "PENDING",
          customerId,
          hospitalId,
          bookedById: session?.user.id ?? null,
          guestName: input.guestName,
          guestEmail: normalizedEmail,
          guestPhone: input.guestPhone,
          contactName: input.contactName,
          contactPhoneExtension: input.contactPhoneExtension,
          medicalRecordNumber: input.medicalRecordNumber,
          pickupAddress: input.dropoffAddress,
          pickupLat: input.dropoffLat,
          pickupLng: input.dropoffLng,
          pickupFacilityName: input.dropoffFacilityName,
          pickupDepartment: input.dropoffDepartment,
          pickupRoom: input.dropoffRoom,
          dropoffAddress: input.pickupAddress,
          dropoffLat: input.pickupLat,
          dropoffLng: input.pickupLng,
          dropoffFacilityName: input.pickupFacilityName,
          dropoffDepartment: input.pickupDepartment,
          dropoffRoom: input.pickupRoom,
          scheduledAt: input.returnScheduledAt,
          pickupTimePreference: input.pickupTimePreference,
          returnTripType,
          mobilityType: input.mobilityType,
          isBariatric: input.isBariatric,
          isOutOfCity,
          passengerWeightKg: input.passengerWeightKg,
          requiresOxygen: oxygenRequirement === "YES",
          oxygenRequirement,
          oxygenLitresPerMinute: oxygenRequirement === "YES" ? input.oxygenLitresPerMinute : null,
          requiresIsolation: isolationRequirement === "YES",
          isolationRequirement,
          isolationDetails: isolationRequirement === "YES" ? input.isolationDetails : null,
          hasDnr: dnrRequirement === "YES",
          dnrRequirement,
          hasBelongings: input.hasBelongings,
          belongingsDescription: input.hasBelongings ? input.belongingsDescription : null,
          escortCount: input.escortCount,
          paymentPreference: input.paymentPreference,
          medicalDocumentsAvailable: input.medicalDocumentsAvailable,
          extraAttendant: input.extraAttendant,
          extraAttendantHours: input.extraAttendant ? input.extraAttendantHours : null,
          estimatedWaitMinutes: input.waitMinutes,
          notes: input.notes,
          distanceKm: returnDistanceKm,
          estimatedFare: returnBreakdown.total,
          roundTripGroupId,
          isReturnLeg: true,
          statusEvents: { create: { status: "PENDING", note: "Return leg created with 10% fare discount" } },
        },
      });
      returnTripId = returnTrip.id;
    }

    await tx.auditLog.create({
      data: {
        userId: session?.user.id ?? accountUser?.id ?? null,
        action: "booking.create",
        entity: "Trip",
        entityId: outboundTrip.id,
        metadata: {
          source,
          accountCreated,
          returnTripType,
          distanceSource: outboundGoogleDistance ? "google" : "manual",
        },
        ipAddress: requestIp(request),
      },
    });

    return { outboundTrip, returnTripId, accountCreated, accountUser, customerId };
    });
  } catch (error) {
    return databaseErrorResponse(error, "The booking could not be created. Please try again.");
  }

  const totalFare = outboundBreakdown.total + (returnBreakdown?.total ?? 0);
  const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;
  const portalPath = `/portal?booked=${result.outboundTrip.id}`;
  const emailStatusPath = source === "HOSPITAL_PORTAL"
    ? `/trips/${result.outboundTrip.id}`
    : result.customerId
      ? portalPath
      : "/login";
  const portalUrl = new URL(emailStatusPath, baseUrl).toString();
  const emailTasks: Promise<boolean>[] = [];

  emailTasks.push(
    sendEmail({
      to: normalizedEmail,
      ...bookingConfirmationEmail({
        referenceCode: result.outboundTrip.referenceCode,
        pickupAddress: input.pickupAddress,
        dropoffAddress: input.dropoffAddress,
        scheduledAt: input.scheduledAt,
        estimatedFare: source === "WEBSITE" ? null : totalFare,
        portalUrl,
      }),
    }),
  );

  const operationsEmail = process.env.BOOKING_NOTIFICATION_EMAIL?.trim();
  if (operationsEmail) {
    emailTasks.push(
      sendEmail({
        to: operationsEmail,
        ...operationsBookingEmail({
          referenceCode: result.outboundTrip.referenceCode,
          sourceLabel: source.toLowerCase().replaceAll("_", " "),
          contactName: input.contactName || input.guestName,
          passengerName: input.guestName,
          contactEmail: normalizedEmail,
          contactPhone: input.guestPhone,
          contactPhoneExtension: input.contactPhoneExtension,
          pickupAddress: input.pickupAddress,
          dropoffAddress: input.dropoffAddress,
          scheduledAt: input.scheduledAt,
          mobilityLabel: input.mobilityType.toLowerCase().replaceAll("_", " "),
          returnTypeLabel: returnTripType.toLowerCase().replaceAll("_", " "),
          estimatedFare: totalFare,
          dispatchUrl: new URL("/dispatch", baseUrl).toString(),
        }),
      }),
    );
  }

  let accessToken: string | null = null;
  if (result.accountCreated && result.accountUser) {
    accessToken = createBookingAccessToken(result.accountUser);
    const setupToken = createPasswordResetToken(result.accountUser);
    const setupUrl = new URL(`/reset-password?new=1&token=${encodeURIComponent(setupToken)}`, baseUrl).toString();
    emailTasks.push(
      sendEmail({
        to: result.accountUser.email,
        ...customerAccountEmail({ firstName: result.accountUser.firstName, setupUrl, portalUrl }),
      }),
    );
  }

  const emailResults = await Promise.all(emailTasks);
  const signedInCustomer = session?.user.role === "CUSTOMER";

  return NextResponse.json({
    referenceCode: result.outboundTrip.referenceCode,
    tripId: result.outboundTrip.id,
    returnTripId: result.returnTripId,
    estimatedFare: totalFare,
    accountCreated: result.accountCreated,
    accessToken,
    portalReady: result.accountCreated || signedInCustomer,
    portalPath,
    emailSent: emailResults.some(Boolean),
    distanceKm: outboundDistanceKm,
    distanceSource: outboundGoogleDistance ? "google" : "manual",
  }, { status: 201 });
}

function splitCustomerName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() || "Gray Jay";
  return { firstName, lastName: parts.join(" ") || "Customer" };
}

async function getHospitalId(userId: string): Promise<string | null> {
  const hospital = await prisma.hospitalAccount.findFirst({ where: { primaryContactId: userId }, select: { id: true } });
  return hospital?.id ?? null;
}
