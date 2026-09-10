import { z } from "zod";

export const mobilityTypeEnum = z.enum(["AMBULATORY", "WHEELCHAIR", "STRETCHER"]);
export const pickupTimePreferenceEnum = z.enum(["SPECIFIC", "ASAP", "FLEXIBLE"]);
export const returnTripTypeEnum = z.enum(["ONE_WAY", "SCHEDULED_RETURN", "WAIT_AND_RETURN", "CALL_FOR_RETURN"]);
export const bookingPaymentPreferenceEnum = z.enum(["CASH", "CARD", "E_TRANSFER", "DIRECT_DEPOSIT", "INVOICE", "DIRECT_BILLING", "INSURANCE", "OPGT", "OTHER"]);
export const careRequirementAnswerEnum = z.enum(["NO", "YES", "NOT_SURE"]);
export const specialAssistanceEnum = z.enum(["NO", "STAIR_CHAIR", "BARIATRIC", "NOT_SURE"]);
export const weightUnitEnum = z.enum(["LB", "KG"]);
export const invoiceRecipientEnum = z.enum(["PATIENT_CLIENT", "HOSPITAL_FACILITY", "OTHER"]);

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
    distanceKm: z.coerce.number().positive().max(5000).optional(),
    guestName: z.string().trim().min(2).max(120),
    guestEmail: z.string().trim().toLowerCase().email().max(254),
    guestPhone: z.string().trim().min(7).max(30),
    contactName: z.string().trim().min(2).max(120).optional(),
    contactPhoneExtension: z.string().trim().max(20).optional(),
    medicalRecordNumber: z.string().trim().max(100).optional(),
    pickupFacilityName: z.string().trim().max(160).optional(),
    pickupDepartment: z.string().trim().max(120).optional(),
    pickupRoom: z.string().trim().max(60).optional(),
    dropoffDepartment: z.string().trim().max(120).optional(),
    dropoffFacilityName: z.string().trim().max(160).optional(),
    dropoffRoom: z.string().trim().max(60).optional(),
    pickupTimePreference: pickupTimePreferenceEnum.default("SPECIFIC"),
    returnTripType: returnTripTypeEnum.optional(),
    escortCount: z.coerce.number().int().min(0).max(10).default(0),
    requiresIsolation: z.coerce.boolean().default(false),
    hasDnr: z.coerce.boolean().default(false),
    oxygenRequirement: careRequirementAnswerEnum.default("NO"),
    oxygenLitresPerMinute: z.coerce.number().positive().max(5).optional(),
    isolationRequirement: careRequirementAnswerEnum.default("NO"),
    isolationDetails: z.string().trim().max(300).optional(),
    dnrRequirement: careRequirementAnswerEnum.default("NO"),
    dnrDocumentationConfirmed: z.coerce.boolean().default(false),
    hasBelongings: z.coerce.boolean().default(false),
    belongingsRequirement: careRequirementAnswerEnum.default("NO"),
    belongingsDescription: z.string().trim().max(1000).optional(),
    paymentPreference: bookingPaymentPreferenceEnum.optional(),
    invoiceRecipient: invoiceRecipientEnum.optional(),
    invoiceName: z.string().trim().max(160).optional(),
    invoiceEmail: z.string().trim().toLowerCase().email().max(254).optional(),
    billingAddress: z.string().trim().max(500).optional(),
    billingOrganization: z.string().trim().max(160).optional(),
    billingAccountNumber: z.string().trim().max(100).optional(),
    billingContactPerson: z.string().trim().max(160).optional(),
    purchaseOrderReference: z.string().trim().max(120).optional(),
    insuranceCompany: z.string().trim().max(160).optional(),
    insuranceClaimNumber: z.string().trim().max(120).optional(),
    insurancePolicyNumber: z.string().trim().max(120).optional(),
    opgtClientInformation: z.string().trim().max(500).optional(),
    opgtContactPerson: z.string().trim().max(160).optional(),
    otherPaymentDetails: z.string().trim().max(1000).optional(),
    patientOver250: careRequirementAnswerEnum.default("NOT_SURE"),
    passengerWeightValue: z.coerce.number().positive().max(2200).optional(),
    passengerWeightUnit: weightUnitEnum.optional(),
    passengerWeightKg: z.coerce.number().int().positive().max(1000).optional(),
    specialAssistance: specialAssistanceEnum.default("NO"),
    stairChairWeightEligible: careRequirementAnswerEnum.optional(),
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
    if (input.oxygenRequirement === "YES" && !input.oxygenLitresPerMinute) {
      context.addIssue({ code: "custom", path: ["oxygenLitresPerMinute"], message: "Enter the oxygen flow rate in LPM." });
    }
    if (input.dnrRequirement === "YES" && !input.dnrDocumentationConfirmed) {
      context.addIssue({ code: "custom", path: ["dnrDocumentationConfirmed"], message: "Confirm that the required DNR documentation will be available at pickup." });
    }
    if (input.isolationRequirement === "YES" && !input.isolationDetails) {
      context.addIssue({ code: "custom", path: ["isolationDetails"], message: "Enter the isolation type or precautions." });
    }
    if (input.belongingsRequirement === "YES" && !input.belongingsDescription) {
      context.addIssue({ code: "custom", path: ["belongingsDescription"], message: "Describe the passenger belongings." });
    }
    if (input.patientOver250 === "YES" && (!input.passengerWeightValue || !input.passengerWeightUnit)) {
      context.addIssue({ code: "custom", path: ["passengerWeightValue"], message: "Enter the patient's approximate weight and unit." });
    }
    if (input.specialAssistance === "STAIR_CHAIR" && !input.stairChairWeightEligible) {
      context.addIssue({ code: "custom", path: ["stairChairWeightEligible"], message: "Confirm whether the patient weighs 250 lb (113 kg) or less." });
    }
    if (input.specialAssistance === "BARIATRIC" && (!input.passengerWeightValue || !input.passengerWeightUnit)) {
      context.addIssue({ code: "custom", path: ["passengerWeightValue"], message: "Enter the patient's approximate weight for bariatric support." });
    }
    if (input.specialAssistance === "BARIATRIC" && input.mobilityType === "AMBULATORY") {
      context.addIssue({ code: "custom", path: ["mobilityType"], message: "Bariatric support is available only for wheelchair and stretcher transportation." });
    }
    if (input.paymentPreference === "INVOICE") {
      if (!input.invoiceRecipient) context.addIssue({ code: "custom", path: ["invoiceRecipient"], message: "Choose who should receive the invoice." });
      if (!input.invoiceName) context.addIssue({ code: "custom", path: ["invoiceName"], message: "Enter the invoice name or organization." });
      if (!input.invoiceEmail) context.addIssue({ code: "custom", path: ["invoiceEmail"], message: "Enter the invoice email address." });
      if (!input.billingAddress) context.addIssue({ code: "custom", path: ["billingAddress"], message: "Enter the billing address." });
    }
    if (input.paymentPreference === "DIRECT_BILLING") {
      if (!input.billingOrganization) context.addIssue({ code: "custom", path: ["billingOrganization"], message: "Enter the account or organization name." });
      if (!input.billingContactPerson) context.addIssue({ code: "custom", path: ["billingContactPerson"], message: "Enter the billing contact person." });
    }
    if (input.paymentPreference === "INSURANCE") {
      if (!input.insuranceCompany) context.addIssue({ code: "custom", path: ["insuranceCompany"], message: "Enter the insurance company." });
      if (!input.insuranceClaimNumber) context.addIssue({ code: "custom", path: ["insuranceClaimNumber"], message: "Enter the claim or reference number." });
    }
    if (input.paymentPreference === "OPGT" && !input.opgtClientInformation) {
      context.addIssue({ code: "custom", path: ["opgtClientInformation"], message: "Enter the OPGT client or account information." });
    }
    if (input.paymentPreference === "OTHER" && !input.otherPaymentDetails) {
      context.addIssue({ code: "custom", path: ["otherPaymentDetails"], message: "Provide the payment details." });
    }
    const returnTripType = input.returnTripType ?? (input.isRoundTrip ? "SCHEDULED_RETURN" : "ONE_WAY");
    const needsScheduledReturn = returnTripType === "SCHEDULED_RETURN";
    if (returnTripType === "WAIT_AND_RETURN" && input.waitMinutes <= 0) {
      context.addIssue({ code: "custom", path: ["waitMinutes"], message: "Enter an approximate waiting time." });
    }
    if (needsScheduledReturn) {
      if (!input.returnScheduledAt) {
        context.addIssue({ code: "custom", path: ["returnScheduledAt"], message: "Return date and time are required." });
      } else if (input.returnScheduledAt <= input.scheduledAt) {
        context.addIssue({ code: "custom", path: ["returnScheduledAt"], message: "Return pickup must be after the outbound pickup." });
      }
    } else if (input.returnScheduledAt && input.returnScheduledAt <= input.scheduledAt) {
      context.addIssue({ code: "custom", path: ["returnScheduledAt"], message: "Return pickup must be after the outbound pickup." });
    }
  });

export type QuoteInput = z.infer<typeof quoteSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
