import "dotenv/config";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeFare, DEFAULT_RULE } from "../../src/lib/pricing";

const weekdayNoon = new Date("2026-08-26T16:00:00.000Z");

function fare(overrides: Partial<Parameters<typeof computeFare>[1]> = {}) {
  return computeFare(DEFAULT_RULE, {
    distanceKm: 10,
    waitMinutes: 0,
    mobilityType: "WHEELCHAIR",
    isBariatric: false,
    isOutOfCity: false,
    requiresOxygen: false,
    extraAttendant: false,
    extraAttendantHours: 0,
    scheduledAt: weekdayNoon,
    ...overrides,
  });
}

describe("Gray Jay Care 2026 pricing", () => {
  it("calculates the London wheelchair and ambulatory tier", () => {
    assert.deepEqual(fare(), {
      baseFare: 50,
      distanceCost: 22,
      bariatricCharge: 0,
      waitCost: 0,
      oxygenCharge: 0,
      attendantCharge: 0,
      weekendNightHolidayCharge: 0,
      roundTripDiscount: 0,
      subtotal: 72,
      tax: 0,
      total: 72,
    });
    assert.equal(fare({ mobilityType: "AMBULATORY" }).total, 72);
  });

  it("uses the two out-of-city distance bands after 100 km", () => {
    assert.equal(fare({ isOutOfCity: true, distanceKm: 150 }).total, 380);
    assert.equal(fare({ mobilityType: "STRETCHER", isOutOfCity: true, distanceKm: 150 }).total, 590);
  });

  it("calculates stretcher, bariatric, wait, oxygen and attendant charges", () => {
    assert.equal(fare({ mobilityType: "STRETCHER" }).total, 152);
    assert.equal(fare({ isBariatric: true }).total, 185);
    assert.equal(
      fare({ waitMinutes: 60, requiresOxygen: true, extraAttendant: true, extraAttendantHours: 2 }).total,
      227,
    );
    assert.equal(fare({ mobilityType: "STRETCHER", waitMinutes: 60 }).waitCost, 75);
  });

  it("adds the flat premium only once when weekend, night and holiday overlap", () => {
    const holidayNight = new Date("2027-01-01T03:00:00.000Z");
    assert.equal(fare({ scheduledAt: holidayNight }).weekendNightHolidayCharge, 50);
  });

  it("applies the round-trip discount only to the return leg", () => {
    assert.equal(fare({ isReturnLeg: false }).total, 72);
    const returnLeg = fare({ isReturnLeg: true });
    assert.equal(returnLeg.roundTripDiscount, 7.2);
    assert.equal(returnLeg.total, 64.8);
  });

  it("rounds configured tax to cents", () => {
    const taxedRule = { ...DEFAULT_RULE, taxRatePct: 13 };
    const result = computeFare(taxedRule, {
      distanceKm: 10,
      waitMinutes: 0,
      mobilityType: "WHEELCHAIR",
      isBariatric: false,
      isOutOfCity: false,
      requiresOxygen: false,
      extraAttendant: false,
      extraAttendantHours: 0,
      scheduledAt: weekdayNoon,
    });
    assert.equal(result.subtotal, 72);
    assert.equal(result.tax, 9.36);
    assert.equal(result.total, 81.36);
  });
});
