import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingSchema } from "../../src/lib/validation/booking";

const baseBooking = () => ({
  pickupAddress: "100 Wellington Street, London, ON",
  dropoffAddress: "800 Commissioners Road East, London, ON",
  distanceKm: 8.5,
  scheduledAt: new Date(Date.now() + 48 * 60 * 60_000).toISOString(),
  guestName: "Test Patient",
  guestEmail: "patient@example.test",
  guestPhone: "5195550199",
});

const issuePaths = (input: Record<string, unknown>) => {
  const parsed = bookingSchema.safeParse(input);
  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."));
};

describe("revised booking validation", () => {
  it("accepts every revised contact, facility, care, payment and belongings field", () => {
    const parsed = bookingSchema.safeParse({
      ...baseBooking(), contactName: "Test Requestor", contactPhoneExtension: "214",
      medicalRecordNumber: "MRN-2026-001", pickupFacilityName: "Victoria Hospital",
      pickupDepartment: "Endoscopy", pickupRoom: "200", dropoffDepartment: "Imaging",
      dropoffFacilityName: "University Hospital", dropoffRoom: "310", pickupTimePreference: "ASAP",
      escortCount: 4, mobilityType: "WHEELCHAIR", patientOver250: "YES", passengerWeightValue: 280, passengerWeightUnit: "LB",
      specialAssistance: "BARIATRIC", oxygenRequirement: "YES", oxygenLitresPerMinute: 5,
      isolationRequirement: "YES", isolationDetails: "Droplet precautions", dnrRequirement: "YES",
      dnrDocumentationConfirmed: true, belongingsRequirement: "YES",
      belongingsDescription: "One bag and a walker", paymentPreference: "OPGT",
      opgtClientInformation: "Client 1234", opgtContactPerson: "Case Worker",
    });
    assert.equal(parsed.success, true);
  });

  it("requires a date only for scheduled-later returns and accepts wait duration by itself", () => {
    assert.equal(bookingSchema.safeParse({ ...baseBooking(), isRoundTrip: true, returnTripType: "SCHEDULED_RETURN" }).success, false);
    assert.equal(bookingSchema.safeParse({
      ...baseBooking(), isRoundTrip: true, returnTripType: "SCHEDULED_RETURN",
      returnScheduledAt: new Date(Date.now() + 50 * 60 * 60_000).toISOString(),
    }).success, true);
    assert.equal(bookingSchema.safeParse({ ...baseBooking(), isRoundTrip: true, returnTripType: "WAIT_AND_RETURN", waitMinutes: 0 }).success, false);
    assert.equal(bookingSchema.safeParse({ ...baseBooking(), isRoundTrip: true, returnTripType: "WAIT_AND_RETURN", waitMinutes: 75 }).success, true);
  });

  it("accepts a public booking without client-supplied distance or MRN", () => {
    assert.equal(bookingSchema.safeParse({ ...baseBooking(), distanceKm: undefined }).success, true);
  });

  it("requires an approximate weight and unit when the patient is over 250 lb", () => {
    const base = { ...baseBooking(), patientOver250: "YES" };
    assert.equal(issuePaths(base).includes("passengerWeightValue"), true);
    assert.equal(bookingSchema.safeParse({ ...base, passengerWeightValue: 125, passengerWeightUnit: "KG" }).success, true);
  });

  it("requires the stair-chair eligibility answer", () => {
    const base = { ...baseBooking(), specialAssistance: "STAIR_CHAIR" };
    assert.equal(issuePaths(base).includes("stairChairWeightEligible"), true);
    assert.equal(bookingSchema.safeParse({ ...base, stairChairWeightEligible: "NOT_SURE" }).success, true);
  });

  it("requires a weight and unit for bariatric support", () => {
    const base = { ...baseBooking(), mobilityType: "WHEELCHAIR", specialAssistance: "BARIATRIC" };
    assert.equal(issuePaths(base).includes("passengerWeightValue"), true);
    assert.equal(bookingSchema.safeParse({ ...base, passengerWeightValue: 300, passengerWeightUnit: "LB" }).success, true);
    assert.equal(bookingSchema.safeParse({ ...base, mobilityType: "AMBULATORY", passengerWeightValue: 300, passengerWeightUnit: "LB" }).success, false);
  });

  it("requires oxygen flow and enforces the documented 5 L/min maximum", () => {
    assert.equal(issuePaths({ ...baseBooking(), oxygenRequirement: "YES" }).includes("oxygenLitresPerMinute"), true);
    assert.equal(bookingSchema.safeParse({ ...baseBooking(), oxygenRequirement: "YES", oxygenLitresPerMinute: 5 }).success, true);
    assert.equal(bookingSchema.safeParse({ ...baseBooking(), oxygenRequirement: "YES", oxygenLitresPerMinute: 5.1 }).success, false);
  });

  it("requires DNR pickup-document confirmation only for Yes", () => {
    assert.equal(issuePaths({ ...baseBooking(), dnrRequirement: "YES" }).includes("dnrDocumentationConfirmed"), true);
    assert.equal(bookingSchema.safeParse({ ...baseBooking(), dnrRequirement: "YES", dnrDocumentationConfirmed: true }).success, true);
    assert.equal(bookingSchema.safeParse({ ...baseBooking(), dnrRequirement: "NOT_SURE" }).success, true);
  });

  it("requires isolation and belongings descriptions only for Yes", () => {
    assert.equal(issuePaths({ ...baseBooking(), isolationRequirement: "YES" }).includes("isolationDetails"), true);
    assert.equal(issuePaths({ ...baseBooking(), belongingsRequirement: "YES" }).includes("belongingsDescription"), true);
    assert.equal(bookingSchema.safeParse({ ...baseBooking(), isolationRequirement: "NOT_SURE", belongingsRequirement: "NOT_SURE" }).success, true);
  });

  it("validates invoice fields while keeping MRN optional", () => {
    const input = { ...baseBooking(), paymentPreference: "INVOICE" };
    assert.deepEqual(issuePaths(input).sort(), ["billingAddress", "invoiceEmail", "invoiceName", "invoiceRecipient"].sort());
    assert.equal(bookingSchema.safeParse({
      ...input, invoiceRecipient: "HOSPITAL_FACILITY", invoiceName: "Victoria Hospital",
      invoiceEmail: "BILLING@EXAMPLE.TEST", billingAddress: "800 Commissioners Road East, London, ON",
      purchaseOrderReference: "PO-123",
    }).success, true);
  });

  it("validates direct billing/account details", () => {
    const input = { ...baseBooking(), paymentPreference: "DIRECT_BILLING" };
    assert.deepEqual(issuePaths(input).sort(), ["billingContactPerson", "billingOrganization"].sort());
    assert.equal(bookingSchema.safeParse({
      ...input, billingOrganization: "London Care Centre", billingContactPerson: "Billing Team",
      billingAccountNumber: "ACC-10",
    }).success, true);
  });

  it("validates insurance, OPGT and other payment details", () => {
    assert.deepEqual(issuePaths({ ...baseBooking(), paymentPreference: "INSURANCE" }).sort(), ["insuranceClaimNumber", "insuranceCompany"].sort());
    assert.deepEqual(issuePaths({ ...baseBooking(), paymentPreference: "OPGT" }), ["opgtClientInformation"]);
    assert.deepEqual(issuePaths({ ...baseBooking(), paymentPreference: "OTHER" }), ["otherPaymentDetails"]);
    assert.equal(bookingSchema.safeParse({ ...baseBooking(), paymentPreference: "CARD" }).success, true);
    assert.equal(bookingSchema.safeParse({ ...baseBooking(), paymentPreference: "E_TRANSFER" }).success, true);
  });
});
