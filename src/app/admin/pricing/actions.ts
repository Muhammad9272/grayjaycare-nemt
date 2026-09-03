"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const money = z.coerce.number().min(0).max(100000);
const percentage = z.coerce.number().min(0).max(100);

const pricingRuleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  wheelchairInCityBase: money,
  wheelchairInCityPerKm: money,
  wheelchairOutCityBase: money,
  wheelchairOutCityPerKmUnder100: money,
  wheelchairOutCityPerKmOver100: money,
  stretcherInCityBase: money,
  stretcherInCityPerKm: money,
  stretcherOutCityBase: money,
  stretcherOutCityPerKmUnder100: money,
  stretcherOutCityPerKmOver100: money,
  bariatricAdditionalCharge: money,
  bariatricPerKm: money,
  weekendNightHolidayFlat: money,
  extraAttendantPerHour: money,
  oxygenFlat: money,
  wheelchairWaitPerHour: money,
  stretcherWaitPerHour: money,
  roundTripDiscountPct: percentage,
  lateCancellationFee: money,
  cancellationWindowHours: z.coerce.number().int().min(0).max(168),
  taxRatePct: percentage,
  nightStartHour: z.coerce.number().int().min(0).max(23),
  nightEndHour: z.coerce.number().int().min(0).max(23),
});

export async function savePricingRule(formData: FormData) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("You are not authorized to update pricing.");
  }

  const parsed = pricingRuleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect("/admin/pricing?error=invalid");
  }

  const current = await prisma.pricingRule.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    const rule = current
      ? await tx.pricingRule.update({ where: { id: current.id }, data: parsed.data })
      : await tx.pricingRule.create({ data: { ...parsed.data, isActive: true } });

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: "pricing.update",
        entity: "PricingRule",
        entityId: rule.id,
        metadata: { name: rule.name },
      },
    });
  });

  revalidatePath("/admin/pricing");
  redirect("/admin/pricing?saved=1");
}
