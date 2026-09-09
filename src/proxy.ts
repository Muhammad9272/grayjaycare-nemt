import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const LEGACY_HOSTS = new Set(["grayjaycare.org", "www.grayjaycare.org"]);

function requestHostname(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.hostname;

  return host.split(":")[0].toLowerCase();
}

export default auth((request) => {
  if (!LEGACY_HOSTS.has(requestHostname(request))) return;

  const destination = request.nextUrl.clone();
  destination.protocol = "https:";
  destination.hostname = "grayjaycare.com";
  destination.port = "";

  return NextResponse.redirect(destination, 308);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
