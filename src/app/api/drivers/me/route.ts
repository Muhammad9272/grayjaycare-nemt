import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { databaseErrorResponse, readJsonBody } from "@/lib/http";

const patchSchema = z.object({ isOnDuty: z.boolean() });

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = patchSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!existing || existing.verificationStatus !== "APPROVED" || existing.licenseExpiry <= new Date()) {
    return NextResponse.json({ error: "Only an approved driver with a valid licence can change duty status." }, { status: 403 });
  }

  try {
    const driver = await prisma.driver.update({
      where: { userId: session.user.id },
      data: { isOnDuty: parsed.data.isOnDuty },
    });
    return NextResponse.json({ driver });
  } catch (error) {
    return databaseErrorResponse(error, "Duty status could not be updated.");
  }
}
