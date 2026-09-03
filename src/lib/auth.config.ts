import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/client";

type ExtraTokenFields = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
};

export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  DISPATCHER: "/dispatch",
  DRIVER: "/driver",
  CUSTOMER: "/portal",
  HOSPITAL: "/hospital",
  ACCOUNTANT: "/accounting",
};

const ALL_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "DISPATCHER", "DRIVER", "CUSTOMER", "HOSPITAL", "ACCOUNTANT"];

const ROUTE_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["SUPER_ADMIN", "ADMIN"] },
  { prefix: "/dispatch", roles: ["SUPER_ADMIN", "ADMIN", "DISPATCHER"] },
  { prefix: "/driver", roles: ["DRIVER"] },
  { prefix: "/portal", roles: ["CUSTOMER"] },
  { prefix: "/hospital", roles: ["HOSPITAL"] },
  { prefix: "/accounting", roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"] },
  { prefix: "/trips", roles: ALL_ROLES },
];

export function allowedForRoute(pathname: string, role: Role): boolean {
  const match = ROUTE_ROLES.find((r) => pathname.startsWith(r.prefix));
  if (!match) return true;
  return match.roles.includes(role);
}

export function isProtectedRoute(pathname: string): boolean {
  return ROUTE_ROLES.some((r) => pathname.startsWith(r.prefix));
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized: ({ auth, request: { nextUrl } }) => {
      const isLoggedIn = !!auth?.user;
      if (!isProtectedRoute(nextUrl.pathname)) return true;
      if (!isLoggedIn) return false;
      return allowedForRoute(nextUrl.pathname, auth.user.role);
    },
    jwt: ({ token, user }) => {
      const t = token as typeof token & Partial<ExtraTokenFields>;
      if (user) {
        t.id = user.id as string;
        t.role = user.role;
        t.firstName = user.firstName;
        t.lastName = user.lastName;
      }
      return t;
    },
    session: ({ session, token }) => {
      const t = token as typeof token & ExtraTokenFields;
      session.user.id = t.id;
      session.user.role = t.role;
      session.user.firstName = t.firstName;
      session.user.lastName = t.lastName;
      return session;
    },
  },
};
