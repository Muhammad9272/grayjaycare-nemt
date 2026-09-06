import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { operationsBookingEmail } from "../../src/lib/email";

describe("operations booking email", () => {
  it("contains dispatch essentials and keeps clinical details in the secure portal", () => {
    const message = operationsBookingEmail({
      referenceCode: "GJC-TEST-01",
      sourceLabel: "website",
      contactName: "Morgan Coordinator",
      passengerName: "Taylor Patient",
      contactEmail: "morgan@example.test",
      contactPhone: "5195550199",
      contactPhoneExtension: "214",
      pickupAddress: "339 Windermere Road, London, ON",
      dropoffAddress: "800 Commissioners Road East, London, ON",
      scheduledAt: new Date("2026-09-10T14:30:00.000Z"),
      mobilityLabel: "wheelchair",
      returnTypeLabel: "one way",
      estimatedFare: 82.22,
      dispatchUrl: "https://grayjaycare.org/dispatch",
    });

    assert.equal(message.subject, "New booking request — GJC-TEST-01");
    assert.match(message.html, /Morgan Coordinator/);
    assert.match(message.html, /5195550199 ext\. 214/);
    assert.match(message.html, /10 September 2026/);
    assert.match(message.html, /\$82\.22/);
    assert.match(message.html, /https:\/\/grayjaycare\.org\/dispatch/);
    assert.match(message.html, /medical record and detailed care information are available only after secure portal sign-in/);
  });

  it("escapes untrusted booking values", () => {
    const message = operationsBookingEmail({
      referenceCode: "GJC-TEST-02",
      sourceLabel: "website",
      contactName: "<script>alert(1)</script>",
      passengerName: "Test Patient",
      contactEmail: "test@example.test",
      contactPhone: "5195550100",
      pickupAddress: "A & B Clinic",
      dropoffAddress: "Hospital",
      scheduledAt: new Date("2026-09-10T14:30:00.000Z"),
      mobilityLabel: "ambulatory",
      returnTypeLabel: "one way",
      estimatedFare: 50,
      dispatchUrl: "https://grayjaycare.org/dispatch",
    });

    assert.doesNotMatch(message.html, /<script>/);
    assert.match(message.html, /&lt;script&gt;/);
    assert.match(message.html, /A &amp; B Clinic/);
  });
});
