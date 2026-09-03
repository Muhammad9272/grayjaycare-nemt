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

describe("booking details validation", () => {
  it("accepts the reference-form contact, facility and care fields", () => {
    const parsed = bookingSchema.safeParse({
      ...baseBooking(),
      contactName: "Test Requestor",
      contactPhoneExtension: "214",
      medicalRecordNumber: "MRN-2026-001",
      pickupDepartment: "Endoscopy",
      pickupRoom: "200",
      dropoffDepartment: "Imaging",
      dropoffRoom: "310",
      pickupTimePreference: "ASAP",
      escortCount: 2,
      requiresIsolation: true,
      hasDnr: true,
      paymentPreference: "CARD",
      medicalDocumentsAvailable: true,
    });
    assert.equal(parsed.success, true);
  });

  it("allows call-for-return without inventing a return pickup time", () => {
    const parsed = bookingSchema.safeParse({
      ...baseBooking(),
      isRoundTrip: true,
      returnTripType: "CALL_FOR_RETURN",
    });
    assert.equal(parsed.success, true);
  });

  it("requires a return pickup for a scheduled return", () => {
    const parsed = bookingSchema.safeParse({
      ...baseBooking(),
      isRoundTrip: true,
      returnTripType: "SCHEDULED_RETURN",
    });
    assert.equal(parsed.success, false);
  });
});
