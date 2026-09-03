import { z } from "zod";

export const mobilityTypeEnum = z.enum(["AMBULATORY", "WHEELCHAIR", "STRETCHER"]);
export const pickupTimePreferenceEnum = z.enum(["SPECIFIC", "ASAP", "FLEXIBLE"]);
export const returnTripTypeEnum = z.enum(["ONE_WAY", "SCHEDULED_RETURN", "WAIT_AND_RETURN", "CALL_FOR_RETURN"]);
export const bookingPaymentPreferenceEnum = z.enum(["CASH", "CARD", "E_TRANSFER", "DIRECT_DEPOSIT", "INVOICE", "OTHER"]);

export const quoteSchema = z.object({
  pickupAddress: z.string().trim().min(3).max(500),
  pickupLat: z.coerce.number().min(-90).max(90).optional(),
  pickupLng: z.coerce.number().min(-180).max(180).optional(),
  dropoffAddress: z.string().trim().min(3).max(500),
  dropoffLat: z.coerce.number().min(-90).max(90).optional(),
  dropoffLng: z.coerce.number().min(-180).max(180).optional(),
  distanceKm: z.coerce.number().positive().max(5000).optional(),
  waitMinutes: z.coerce.number().int().min(0).max(1440).default(0),
  mobilityType: mobilityTypeEnum.default("AMBULATORY"),
  isBariatric: z.coerce.boolean().default(false),
  isOutOfCity: z.coerce.boolean().default(false),
  requiresOxygen: z.coerce.boolean().default(false),
  extraAttendant: z.coerce.boolean().default(false),
  extraAttendantHours: z.coerce.number().min(0).max(24).default(0),
  scheduledAt: z.coerce.date(),
  isReturnLeg: z.coerce.boolean().default(false),
});

export const bookingSchema = quoteSchema
  .extend({
    distanceKm: z.coerce.number().positive().max(5000),
    guestName: z.string().trim().min(2).max(120),
    guestEmail: z.string().trim().toLowerCase().email().max(254),
    guestPhone: z.string().trim().min(7).max(30),
    contactName: z.string().trim().min(2).max(120).optional(),
    contactPhoneExtension: z.string().trim().max(20).optional(),
    medicalRecordNumber: z.string().trim().max(100).optional(),
    pickupDepartment: z.string().trim().max(120).optional(),
    pickupRoom: z.string().trim().max(60).optional(),
    dropoffDepartment: z.string().trim().max(120).optional(),
    dropoffRoom: z.string().trim().max(60).optional(),
    pickupTimePreference: pickupTimePreferenceEnum.default("SPECIFIC"),
    returnTripType: returnTripTypeEnum.optional(),
    escortCount: z.coerce.number().int().min(0).max(10).default(0),
    requiresIsolation: z.coerce.boolean().default(false),
    hasDnr: z.coerce.boolean().default(false),
    paymentPreference: bookingPaymentPreferenceEnum.optional(),
    medicalDocumentsAvailable: z.coerce.boolean().default(false),
    passengerWeightKg: z.coerce.number().int().positive().max(1000).optional(),
    notes: z.string().trim().max(2000).optional(),
    source: z.enum(["WEBSITE", "PHONE"]).optional(),
    isRoundTrip: z.coerce.boolean().default(false),
    returnScheduledAt: z.coerce.date().optional(),
    returnDistanceKm: z.coerce.number().positive().max(5000).optional(),
  })
  .superRefine((input, context) => {
    if (input.scheduledAt.getTime() < Date.now() - 5 * 60_000) {
      context.addIssue({ code: "custom", path: ["scheduledAt"], message: "Pickup time cannot be in the past." });
    }
    if (input.extraAttendant && input.extraAttendantHours <= 0) {
      context.addIssue({ code: "custom", path: ["extraAttendantHours"], message: "Enter the attendant time." });
    }
    const returnTripType = input.returnTripType ?? (input.isRoundTrip ? "SCHEDULED_RETURN" : "ONE_WAY");
    const needsScheduledReturn = returnTripType === "SCHEDULED_RETURN" || returnTripType === "WAIT_AND_RETURN";
    if (needsScheduledReturn) {
      if (!input.returnScheduledAt || !input.returnDistanceKm) {
        context.addIssue({ code: "custom", path: ["returnScheduledAt"], message: "Return date, time and distance are required." });
      } else if (input.returnScheduledAt <= input.scheduledAt) {
        context.addIssue({ code: "custom", path: ["returnScheduledAt"], message: "Return pickup must be after the outbound pickup." });
      }
    }
  });

export type QuoteInput = z.infer<typeof quoteSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
