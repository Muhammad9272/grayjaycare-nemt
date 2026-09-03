import { prisma } from "@/lib/prisma";
import type { MobilityType, PricingRule } from "@/generated/prisma/client";

export type FareInput = {
  distanceKm: number;
  waitMinutes: number;
  mobilityType: MobilityType;
  isBariatric: boolean;
  isOutOfCity: boolean;
  requiresOxygen: boolean;
  extraAttendant: boolean;
  extraAttendantHours: number;
  scheduledAt: Date;
  isHoliday?: boolean;
  isReturnLeg?: boolean;
};

export type FareBreakdown = {
  baseFare: number;
  distanceCost: number;
  bariatricCharge: number;
  waitCost: number;
  oxygenCharge: number;
  attendantCharge: number;
  weekendNightHolidayCharge: number;
  roundTripDiscount: number;
  subtotal: number;
  tax: number;
  total: number;
};

// Gray Jay Care — Updated Price List 2026 (Southwestern Ontario, base city: London, ON)
export const DEFAULT_RULE = {
  wheelchairInCityBase: 50,
  wheelchairInCityPerKm: 2.2,
  wheelchairOutCityBase: 60,
  wheelchairOutCityPerKmUnder100: 2.2,
  wheelchairOutCityPerKmOver100: 2.0,

  stretcherInCityBase: 120,
  stretcherInCityPerKm: 3.2,
  stretcherOutCityBase: 120,
  stretcherOutCityPerKmUnder100: 3.2,
  stretcherOutCityPerKmOver100: 3.0,

  bariatricAdditionalCharge: 100,
  bariatricPerKm: 3.5,

  weekendNightHolidayFlat: 50,
  extraAttendantPerHour: 50,
  oxygenFlat: 10,
  wheelchairWaitPerHour: 45,
  stretcherWaitPerHour: 75,

  roundTripDiscountPct: 10,
  lateCancellationFee: 120,
  cancellationWindowHours: 3,

  taxRatePct: 0,
  nightStartHour: 21,
  nightEndHour: 6,
};

export async function getActivePricingRule(): Promise<PricingRule | typeof DEFAULT_RULE> {
  const rule = await prisma.pricingRule.findFirst({ where: { isActive: true }, orderBy: { updatedAt: "desc" } });
  return rule ?? DEFAULT_RULE;
}

type ServiceDateParts = { year: number; month: number; day: number; hour: number; weekday: string };

function getServiceDateParts(date: Date): ServiceDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 0),
    day: Number(parts.find((part) => part.type === "day")?.value ?? 0),
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? 0),
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
  };
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, occurrence: number): number {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((weekday - firstWeekday + 7) % 7) + (occurrence - 1) * 7;
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Ontario's nine public holidays, as defined by the Employment Standards Act guide. */
function isOntarioPublicHoliday({ year, month, day }: ServiceDateParts): boolean {
  if ((month === 1 && day === 1) || (month === 7 && day === 1) || (month === 12 && (day === 25 || day === 26))) {
    return true;
  }

  if (month === 2 && day === nthWeekdayOfMonth(year, 2, 1, 3)) return true; // Family Day
  if (month === 9 && day === nthWeekdayOfMonth(year, 9, 1, 1)) return true; // Labour Day
  if (month === 10 && day === nthWeekdayOfMonth(year, 10, 1, 2)) return true; // Thanksgiving

  const may24Weekday = new Date(Date.UTC(year, 4, 24)).getUTCDay();
  const victoriaDay = 24 - ((may24Weekday + 6) % 7);
  if (month === 5 && day === victoriaDay) return true;

  const goodFriday = easterSunday(year);
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
  return month === goodFriday.getUTCMonth() + 1 && day === goodFriday.getUTCDate();
}

function isNightHour(hour: number, startHour: number, endHour: number): boolean {
  if (startHour > endHour) {
    return hour >= startHour || hour < endHour;
  }
  return hour >= startHour && hour < endHour;
}

function tieredDistanceCost(
  distanceKm: number,
  isOutOfCity: boolean,
  inCityPerKm: number,
  outCityPerKmUnder100: number,
  outCityPerKmOver100: number,
): number {
  if (!isOutOfCity) return inCityPerKm * distanceKm;
  if (distanceKm <= 100) return outCityPerKmUnder100 * distanceKm;
  return outCityPerKmUnder100 * 100 + outCityPerKmOver100 * (distanceKm - 100);
}

/** Ambulatory trips use the wheelchair-tier vehicle & rates (the base service tier). */
function isStretcherTier(mobilityType: MobilityType): boolean {
  return mobilityType === "STRETCHER";
}

export function computeFare(rule: PricingRule | typeof DEFAULT_RULE, input: FareInput): FareBreakdown {
  const stretcherTier = isStretcherTier(input.mobilityType);

  const baseFare = stretcherTier
    ? Number(input.isOutOfCity ? rule.stretcherOutCityBase : rule.stretcherInCityBase)
    : Number(input.isOutOfCity ? rule.wheelchairOutCityBase : rule.wheelchairInCityBase);

  let distanceCost: number;
  let bariatricCharge = 0;
  if (input.isBariatric) {
    // Bariatric service uses a flat per-km rate regardless of in/out-of-city, plus a flat additional charge.
    distanceCost = Number(rule.bariatricPerKm) * input.distanceKm;
    bariatricCharge = Number(rule.bariatricAdditionalCharge);
  } else if (stretcherTier) {
    distanceCost = tieredDistanceCost(
      input.distanceKm,
      input.isOutOfCity,
      Number(rule.stretcherInCityPerKm),
      Number(rule.stretcherOutCityPerKmUnder100),
      Number(rule.stretcherOutCityPerKmOver100),
    );
  } else {
    distanceCost = tieredDistanceCost(
      input.distanceKm,
      input.isOutOfCity,
      Number(rule.wheelchairInCityPerKm),
      Number(rule.wheelchairOutCityPerKmUnder100),
      Number(rule.wheelchairOutCityPerKmOver100),
    );
  }

  const waitPerHour = stretcherTier ? Number(rule.stretcherWaitPerHour) : Number(rule.wheelchairWaitPerHour);
  const waitCost = (waitPerHour / 60) * input.waitMinutes;

  const oxygenCharge = input.requiresOxygen ? Number(rule.oxygenFlat) : 0;
  const attendantCharge = input.extraAttendant ? Number(rule.extraAttendantPerHour) * input.extraAttendantHours : 0;

  const serviceDate = getServiceDateParts(input.scheduledAt);
  const isWeekend = serviceDate.weekday === "Sat" || serviceDate.weekday === "Sun";
  const isNight = isNightHour(serviceDate.hour, rule.nightStartHour, rule.nightEndHour);
  const isHoliday = Boolean(input.isHoliday) || isOntarioPublicHoliday(serviceDate);
  const weekendNightHolidayCharge = isWeekend || isNight || isHoliday ? Number(rule.weekendNightHolidayFlat) : 0;

  const preDiscountSubtotal =
    baseFare + distanceCost + bariatricCharge + waitCost + oxygenCharge + attendantCharge + weekendNightHolidayCharge;

  const roundTripDiscount = input.isReturnLeg ? preDiscountSubtotal * (Number(rule.roundTripDiscountPct) / 100) : 0;

  const subtotal = preDiscountSubtotal - roundTripDiscount;
  const tax = subtotal * (Number(rule.taxRatePct) / 100);
  const total = subtotal + tax;

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    baseFare: round(baseFare),
    distanceCost: round(distanceCost),
    bariatricCharge: round(bariatricCharge),
    waitCost: round(waitCost),
    oxygenCharge: round(oxygenCharge),
    attendantCharge: round(attendantCharge),
    weekendNightHolidayCharge: round(weekendNightHolidayCharge),
    roundTripDiscount: round(roundTripDiscount),
    subtotal: round(subtotal),
    tax: round(tax),
    total: round(total),
  };
}
