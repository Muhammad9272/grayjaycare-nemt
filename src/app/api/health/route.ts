import { prisma } from "@/lib/prisma";
import { googleMapsConfigured } from "@/lib/googleMaps";
import { noStoreJson } from "@/lib/http";

export async function GET() {
  try {
    await prisma.pricingRule.count({ where: { isActive: true } });
    return noStoreJson({
      status: "ok",
      database: "connected",
      integrations: {
        googleMaps: googleMapsConfigured() ? "configured" : "not_configured",
        email: process.env.MAIL_HOST && process.env.MAIL_PORT && process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD
          ? "configured"
          : "not_configured",
      },
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return noStoreJson({ status: "unavailable", database: "disconnected", checkedAt: new Date().toISOString() }, { status: 503 });
  }
}
