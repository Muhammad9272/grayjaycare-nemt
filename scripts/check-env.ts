import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { verifyEmailTransport } from "../src/lib/email";

const failures: string[] = [];
const warnings: string[] = [];

function requireValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) failures.push(`${name} is required.`);
  return value ?? "";
}

function validateOptionalGroup(label: string, names: string[]) {
  const configured = names.filter((name) => Boolean(process.env[name]?.trim()));
  if (configured.length > 0 && configured.length !== names.length) {
    warnings.push(`${label} is only partially configured; it remains inactive until all values are supplied.`);
  }
}

const authSecret = requireValue("AUTH_SECRET");
if (authSecret && authSecret.length < 32) failures.push("AUTH_SECRET must contain at least 32 characters.");

const applicationUrl = requireValue("NEXTAUTH_URL");
if (applicationUrl) {
  try {
    const url = new URL(applicationUrl);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (process.env.NODE_ENV === "production" && (url.protocol !== "https:" || local)) {
      failures.push("NEXTAUTH_URL must be the public HTTPS URL in production.");
    }
  } catch {
    failures.push("NEXTAUTH_URL must be a valid absolute URL.");
  }
}

requireValue("DATABASE_URL");
if (!process.env.GOOGLE_MAPS_KEY?.trim() && !process.env.GOOGLE_MAPS_API_KEY?.trim()) {
  failures.push("GOOGLE_MAPS_KEY is required for address and distance lookup.");
}

for (const name of ["MAIL_HOST", "MAIL_PORT", "MAIL_USERNAME", "MAIL_PASSWORD", "EMAIL_FROM"]) requireValue(name);
const mailPort = Number(process.env.MAIL_PORT);
if (process.env.MAIL_PORT && (!Number.isInteger(mailPort) || mailPort <= 0 || mailPort > 65535)) {
  failures.push("MAIL_PORT must be a valid TCP port.");
}

validateOptionalGroup("Stripe", ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"]);
validateOptionalGroup("Twilio", ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"]);

if (failures.length === 0) {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    failures.push("DATABASE_URL is configured, but the database connection failed.");
  }

  if (!(await verifyEmailTransport())) failures.push("SMTP is configured, but transport verification failed.");
}

await prisma.$disconnect();

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAILED: ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Environment ready: authentication, database, Google Maps, and SMTP are configured.");
}
