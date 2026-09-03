import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type TokenPurpose = "booking-access" | "password-reset";

type AccountTokenPayload = {
  userId: string;
  email: string;
  purpose: TokenPurpose;
  expiresAt: number;
  credentialVersion?: string;
};

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for secure account links.");
  return secret;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", signingSecret()).update(encodedPayload).digest("base64url");
}

function createToken(payload: AccountTokenPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function passwordCredentialVersion(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 24);
}

export function createBookingAccessToken(user: { id: string; email: string; passwordHash: string }): string {
  return createToken({
    userId: user.id,
    email: user.email,
    purpose: "booking-access",
    expiresAt: Date.now() + 10 * 60 * 1000,
    credentialVersion: passwordCredentialVersion(user.passwordHash),
  });
}

export function createPasswordResetToken(user: { id: string; email: string; passwordHash: string }): string {
  return createToken({
    userId: user.id,
    email: user.email,
    purpose: "password-reset",
    expiresAt: Date.now() + 60 * 60 * 1000,
    credentialVersion: passwordCredentialVersion(user.passwordHash),
  });
}

export function verifyAccountToken(token: string, purpose: TokenPurpose): AccountTokenPayload | null {
  if (token.length < 40 || token.length > 2000) return null;
  const [encodedPayload, suppliedSignature, ...rest] = token.split(".");
  if (!encodedPayload || !suppliedSignature || rest.length > 0) return null;

  const expectedSignature = sign(encodedPayload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AccountTokenPayload;
    if (
      payload.purpose !== purpose ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now() ||
      payload.expiresAt > Date.now() + 2 * 60 * 60 * 1000 ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      !payload.userId ||
      !payload.email
    ) return null;
    return payload;
  } catch {
    return null;
  }
}
