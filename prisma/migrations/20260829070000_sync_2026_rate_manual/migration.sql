-- Synchronize active rate sheets with the approved Gray Jay Care Service & Rate Manual 2026.
UPDATE `pricing_rules`
SET
  `wheelchairInCityBase` = 50.00,
  `wheelchairInCityPerKm` = 2.20,
  `wheelchairOutCityBase` = 60.00,
  `wheelchairOutCityPerKmUnder100` = 2.20,
  `wheelchairOutCityPerKmOver100` = 2.00,
  `stretcherInCityBase` = 120.00,
  `stretcherInCityPerKm` = 3.20,
  `stretcherOutCityBase` = 120.00,
  `stretcherOutCityPerKmUnder100` = 3.20,
  `stretcherOutCityPerKmOver100` = 3.00,
  `bariatricAdditionalCharge` = 100.00,
  `bariatricPerKm` = 3.50,
  `weekendNightHolidayFlat` = 50.00,
  `extraAttendantPerHour` = 50.00,
  `oxygenFlat` = 10.00,
  `wheelchairWaitPerHour` = 45.00,
  `stretcherWaitPerHour` = 75.00,
  `roundTripDiscountPct` = 10.00,
  `lateCancellationFee` = 120.00,
  `cancellationWindowHours` = 3,
  `taxRatePct` = 0.00,
  `nightStartHour` = 21,
  `nightEndHour` = 6
WHERE `isActive` = true;
