import { NextResponse } from "next/server";

const MAX_JSON_BYTES = 1_000_000;

export type JsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse };

export async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 }),
    };
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body is too large." }, { status: 413 }),
    };
  }

  try {
    return { ok: true, data: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body must contain valid JSON." }, { status: 400 }),
    };
  }
}

function errorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

export function databaseErrorResponse(error: unknown, fallback = "The request could not be completed."): NextResponse {
  const code = errorCode(error);
  if (code === "P2025") return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
  if (code === "P2002") return NextResponse.json({ error: "A record with these details already exists." }, { status: 409 });
  if (code === "P2003") return NextResponse.json({ error: "This record is still connected to another record." }, { status: 409 });

  console.error("API database operation failed", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export function noStoreJson(body: object, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
