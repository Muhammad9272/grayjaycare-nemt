import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatServiceDate,
  formatServiceDateTime,
  parseTorontoDate,
  serviceDateInputValue,
  serviceDateTimeInputValue,
  torontoLocalDateTimeToIso,
} from "../../src/lib/dates";

describe("Toronto service dates", () => {
  it("converts winter and summer local times using the correct UTC offset", () => {
    assert.equal(torontoLocalDateTimeToIso("2026-01-15T12:30"), "2026-01-15T17:30:00.000Z");
    assert.equal(torontoLocalDateTimeToIso("2026-07-15T12:30"), "2026-07-15T16:30:00.000Z");
  });

  it("builds inclusive start and exclusive end boundaries across daylight saving time", () => {
    assert.equal(parseTorontoDate("2026-03-08")?.toISOString(), "2026-03-08T05:00:00.000Z");
    assert.equal(parseTorontoDate("2026-03-08", true)?.toISOString(), "2026-03-09T04:00:00.000Z");
  });

  it("rejects invalid calendar dates and malformed values", () => {
    assert.equal(parseTorontoDate("2026-02-30"), null);
    assert.equal(parseTorontoDate("08/29/2026"), null);
    assert.throws(() => torontoLocalDateTimeToIso("not-a-date"));
  });

  it("creates stable Toronto input values regardless of the machine time zone", () => {
    const value = new Date("2026-08-29T04:15:00.000Z");
    assert.equal(serviceDateInputValue(value), "2026-08-29");
    assert.equal(serviceDateTimeInputValue(value), "2026-08-29T00:15");
  });

  it("displays dates with the full month name in day-month-year order", () => {
    const value = new Date("2026-08-29T16:15:00.000Z");
    assert.equal(formatServiceDate(value), "29 August 2026");
    assert.match(formatServiceDateTime(value), /^29 August 2026/);
  });
});
