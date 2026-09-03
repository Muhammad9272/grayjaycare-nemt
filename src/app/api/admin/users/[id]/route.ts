import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { databaseErrorResponse, readJsonBody } from "@/lib/http";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (id === session.user.id) {
    return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = schema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only a super admin can change a super admin account." }, { status: 403 });
  }

  try {
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { isActive: parsed.data.isActive },
        select: { id: true, isActive: true },
      }),
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: parsed.data.isActive ? "user.activate" : "user.deactivate",
          entity: "User",
          entityId: id,
        },
      }),
      ...(parsed.data.isActive ? [] : [prisma.driver.updateMany({ where: { userId: id }, data: { isOnDuty: false } })]),
    ]);

    return NextResponse.json({ user });
  } catch (error) {
    return databaseErrorResponse(error, "The account status could not be updated.");
  }
}
