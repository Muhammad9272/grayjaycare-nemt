import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { passwordCredentialVersion, verifyAccountToken } from "@/lib/accountTokens";
import { requestIp, withinRateLimit } from "@/lib/rateLimit";
import { databaseErrorResponse, readJsonBody } from "@/lib/http";

export async function POST(request: Request) {
  if (!withinRateLimit(`password:reset:${requestIp(request)}`, 12, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please request a new link." }, { status: 429 });
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = resetPasswordSchema.safeParse(json.data);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check your password.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = verifyAccountToken(parsed.data.token, "password-reset");
  if (!payload) return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, passwordHash: true, isActive: true },
  });
  if (
    !user?.isActive ||
    user.email !== payload.email ||
    payload.credentialVersion !== passwordCredentialVersion(user.passwordHash)
  ) {
    return NextResponse.json({ error: "This link is invalid or has already been used." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, emailVerified: new Date() },
      }),
      prisma.auditLog.create({
        data: { userId: user.id, action: "account.password_reset", entity: "User", entityId: user.id },
      }),
    ]);
  } catch (error) {
    return databaseErrorResponse(error, "The password could not be updated.");
  }

  return NextResponse.json({ ok: true, email: user.email });
}
