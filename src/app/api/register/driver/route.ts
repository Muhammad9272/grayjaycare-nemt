import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerDriverSchema } from "@/lib/validation/auth";
import { databaseErrorResponse, readJsonBody } from "@/lib/http";
import { requestIp, withinRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  if (!withinRateLimit(`register:driver:${requestIp(request)}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many application attempts. Please try again later." }, { status: 429 });
  }
  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = registerDriverSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: "DRIVER",
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        driverProfile: {
          create: {
            licenseNumber: input.licenseNumber,
            licenseExpiry: input.licenseExpiry,
            verificationStatus: "PENDING",
          },
        },
      },
    });
  } catch (error) {
    return databaseErrorResponse(error, "The driver application could not be submitted.");
  }

  return NextResponse.json({ ok: true });
}
