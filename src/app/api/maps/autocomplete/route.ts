import { NextResponse } from "next/server";
import { z } from "zod";
import { getAddressSuggestions, googleMapsConfigured } from "@/lib/googleMaps";
import { requestIp, withinRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/http";

const autocompleteSchema = z.object({
  input: z.string().trim().min(3).max(180),
  sessionToken: z.string().min(16).max(36),
});

export async function POST(request: Request) {
  if (!withinRateLimit(`maps:auto:${requestIp(request)}`, 80, 60_000)) {
    return NextResponse.json({ error: "Too many address searches. Please wait a moment." }, { status: 429 });
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = autocompleteSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ suggestions: [] }, { status: 400 });
  if (!googleMapsConfigured()) return NextResponse.json({ suggestions: [], configured: false });

  try {
    const suggestions = await getAddressSuggestions(parsed.data.input, parsed.data.sessionToken);
    return NextResponse.json({ suggestions, configured: true });
  } catch {
    return NextResponse.json({ suggestions: [], configured: true });
  }
}
