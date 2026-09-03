import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlaceDetails } from "@/lib/googleMaps";
import { requestIp, withinRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/http";

const placeSchema = z.object({
  placeId: z.string().min(3).max(300),
  sessionToken: z.string().min(16).max(36),
});

export async function POST(request: Request) {
  if (!withinRateLimit(`maps:place:${requestIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many address selections. Please wait a moment." }, { status: 429 });
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = placeSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Invalid place selection." }, { status: 400 });

  try {
    const place = await getPlaceDetails(parsed.data.placeId, parsed.data.sessionToken);
    if (!place) return NextResponse.json({ error: "Address details are unavailable." }, { status: 404 });
    return NextResponse.json({ place });
  } catch {
    return NextResponse.json({ error: "Address details are unavailable." }, { status: 502 });
  }
}
