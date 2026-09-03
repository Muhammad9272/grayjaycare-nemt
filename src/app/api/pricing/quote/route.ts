import { NextResponse } from "next/server";
import { quoteSchema } from "@/lib/validation/booking";
import { getDistance } from "@/lib/googleMaps";
import { getActivePricingRule, computeFare } from "@/lib/pricing";
import { readJsonBody } from "@/lib/http";
import { requestIp, withinRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  if (!withinRateLimit(`pricing:quote:${requestIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many quote requests. Please wait a moment." }, { status: 429 });
  }
  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = quoteSchema.safeParse(json.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  let distanceKm = input.distanceKm ?? null;
  let distanceSource: "google" | "manual" | null = distanceKm ? "manual" : null;

  if (!distanceKm) {
    const distance = await getDistance(input.pickupAddress, input.dropoffAddress);
    if (distance) {
      distanceKm = Math.round(distance.distanceKm * 10) / 10;
      distanceSource = "google";
    }
  }

  if (!distanceKm) {
    return NextResponse.json({
      distanceKm: null,
      distanceSource: null,
      breakdown: null,
      message: "Could not auto-calculate distance. Enter an estimated distance in km.",
    });
  }

  const rule = await getActivePricingRule();
  const breakdown = computeFare(rule, {
    distanceKm,
    waitMinutes: input.waitMinutes,
    mobilityType: input.mobilityType,
    isBariatric: input.isBariatric,
    isOutOfCity: input.isOutOfCity,
    requiresOxygen: input.requiresOxygen,
    extraAttendant: input.extraAttendant,
    extraAttendantHours: input.extraAttendantHours,
    scheduledAt: input.scheduledAt,
    isReturnLeg: input.isReturnLeg,
  });

  return NextResponse.json({ distanceKm, distanceSource, breakdown });
}
