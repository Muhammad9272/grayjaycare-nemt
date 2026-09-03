import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { createPasswordResetToken } from "@/lib/accountTokens";
import { passwordResetEmail, sendEmail } from "@/lib/email";
import { requestIp, withinRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/http";

export async function POST(request: Request) {
  if (!withinRateLimit(`password:forgot:${requestIp(request)}`, 8, 15 * 60_000)) {
    return NextResponse.json({ ok: true });
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = forgotPasswordSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, firstName: true, passwordHash: true, isActive: true },
  });

  if (user?.isActive) {
    const token = createPasswordResetToken(user);
    const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;
    const resetUrl = new URL(`/reset-password?token=${encodeURIComponent(token)}`, baseUrl).toString();
    await sendEmail({ to: user.email, ...passwordResetEmail({ firstName: user.firstName, resetUrl }) });
  }

  return NextResponse.json({ ok: true });
}
