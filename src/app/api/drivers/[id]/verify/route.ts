import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { databaseErrorResponse, readJsonBody } from "@/lib/http";

const schema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = schema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.driver.findUnique({ where: { id }, select: { licenseExpiry: true } });
  if (!existing) return NextResponse.json({ error: "Driver not found." }, { status: 404 });
  if (parsed.data.status === "APPROVED" && existing.licenseExpiry <= new Date()) {
    return NextResponse.json({ error: "A driver with an expired licence cannot be approved." }, { status: 400 });
  }

  try {
    const [driver] = await prisma.$transaction([
      prisma.driver.update({
        where: { id },
        data: {
          verificationStatus: parsed.data.status,
          verifiedById: session.user.id,
          verifiedAt: new Date(),
          ...(parsed.data.status === "REJECTED" ? { isOnDuty: false } : {}),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: `driver.${parsed.data.status.toLowerCase()}`,
          entity: "Driver",
          entityId: id,
        },
      }),
    ]);

    return NextResponse.json({ driver });
  } catch (error) {
    return databaseErrorResponse(error, "The driver verification could not be updated.");
  }
}
