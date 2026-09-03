import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStaffSchema } from "@/lib/validation/admin";
import { accountInviteEmail, sendEmail } from "@/lib/email";
import { createPasswordResetToken } from "@/lib/accountTokens";
import { databaseErrorResponse, readJsonBody } from "@/lib/http";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = createStaffSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  if (input.role === "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only a super admin can create another admin." }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);

  let user: { id: string; email: string; firstName: string; passwordHash: string };
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: input.role,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
        },
        select: { id: true, email: true, firstName: true, passwordHash: true },
      });

      if (input.role === "HOSPITAL") {
        await tx.hospitalAccount.create({
          data: {
            name: input.hospitalName!,
            billingEmail: input.hospitalBillingEmail ?? input.email,
            address: input.hospitalAddress,
            primaryContactId: created.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "staff.create",
          entity: "User",
          entityId: created.id,
          metadata: { role: input.role },
        },
      });
      return created;
    });
  } catch (error) {
    return databaseErrorResponse(error, "The account could not be created.");
  }

  const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;
  const setupToken = createPasswordResetToken(user);
  const setupUrl = new URL(`/reset-password?new=1&token=${encodeURIComponent(setupToken)}`, baseUrl).toString();
  const roleLabel = input.role === "HOSPITAL" ? "hospital" : input.role.toLowerCase();
  const emailSent = await sendEmail({
    to: user.email,
    ...accountInviteEmail({ firstName: user.firstName, roleLabel, setupUrl }),
  });

  return NextResponse.json({ ok: true, userId: user.id, emailSent });
}
