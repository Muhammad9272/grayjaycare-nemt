import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { Role } from "@/generated/prisma/client";
import { verifyAccountToken } from "@/lib/accountTokens";
import { passwordCredentialVersion } from "@/lib/accountTokens";
import { requestIp, withinRateLimit } from "@/lib/rateLimit";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      firstName: string;
      lastName: string;
    } & DefaultSessionUser;
  }
  interface User {
    role: Role;
    firstName: string;
    lastName: string;
  }
}

type DefaultSessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

const nextAuth = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        if (!withinRateLimit(`auth:login:${requestIp(request)}:${email}`, 12, 15 * 60_000)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`,
        };
      },
    }),
    Credentials({
      id: "booking-access",
      name: "Booking access",
      credentials: { token: { label: "Booking access token", type: "text" } },
      authorize: async (credentials) => {
        const token = credentials?.token as string | undefined;
        if (!token) return null;
        const payload = verifyAccountToken(token, "booking-access");
        if (!payload) return null;

        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (
          !user ||
          !user.isActive ||
          user.email !== payload.email ||
          user.role !== "CUSTOMER" ||
          (payload.credentialVersion && payload.credentialVersion !== passwordCredentialVersion(user.passwordHash))
        ) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`,
        };
      },
    }),
  ],
});

export const { handlers, signIn, signOut } = nextAuth;

/**
 * App-level session lookup. Proxy provides the fast route gate; this second check
 * ensures deactivated users or users whose role changed lose data access immediately.
 */
export async function auth() {
  const session = await nextAuth.auth();
  if (!session?.user?.id) return null;
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isActive: true, role: true },
  });
  if (!current?.isActive || current.role !== session.user.role) return null;
  return session;
}
