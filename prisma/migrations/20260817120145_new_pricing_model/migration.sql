/*
  Warnings:

  - You are about to drop the column `baseFare` on the `pricing_rules` table. All the data in the column will be lost.
  - You are about to drop the column `holidaySurchargePct` on the `pricing_rules` table. All the data in the column will be lost.
  - You are about to drop the column `nightSurchargePct` on the `pricing_rules` table. All the data in the column will be lost.
  - You are about to drop the column `oxygenSurcharge` on the `pricing_rules` table. All the data in the column will be lost.
  - You are about to drop the column `perKmRate` on the `pricing_rules` table. All the data in the column will be lost.
  - You are about to drop the column `perMinuteWaitRate` on the `pricing_rules` table. All the data in the column will be lost.
  - You are about to drop the column `stairsSurcharge` on the `pricing_rules` table. All the data in the column will be lost.
  - You are about to drop the column `stretcherSurcharge` on the `pricing_rules` table. All the data in the column will be lost.
  - You are about to drop the column `wheelchairSurcharge` on the `pricing_rules` table. All the data in the column will be lost.
  - You are about to drop the column `requiresStairs` on the `trips` table. All the data in the column will be lost.
  - Added the required column `bariatricAdditionalCharge` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bariatricPerKm` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `extraAttendantPerHour` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lateCancellationFee` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `oxygenFlat` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stretcherInCityBase` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stretcherInCityPerKm` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stretcherOutCityBase` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stretcherOutCityPerKmOver100` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stretcherOutCityPerKmUnder100` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stretcherWaitPerHour` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weekendNightHolidayFlat` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wheelchairInCityBase` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wheelchairInCityPerKm` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wheelchairOutCityBase` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wheelchairOutCityPerKmOver100` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wheelchairOutCityPerKmUnder100` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wheelchairWaitPerHour` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `pricing_rules` DROP COLUMN `baseFare`,
    DROP COLUMN `holidaySurchargePct`,
    DROP COLUMN `nightSurchargePct`,
    DROP COLUMN `oxygenSurcharge`,
    DROP COLUMN `perKmRate`,
    DROP COLUMN `perMinuteWaitRate`,
    DROP COLUMN `stairsSurcharge`,
    DROP COLUMN `stretcherSurcharge`,
    DROP COLUMN `wheelchairSurcharge`,
    ADD COLUMN `bariatricAdditionalCharge` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `bariatricPerKm` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `cancellationWindowHours` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `extraAttendantPerHour` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `lateCancellationFee` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `oxygenFlat` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `roundTripDiscountPct` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `stretcherInCityBase` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `stretcherInCityPerKm` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `stretcherOutCityBase` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `stretcherOutCityPerKmOver100` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `stretcherOutCityPerKmUnder100` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `stretcherWaitPerHour` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `weekendNightHolidayFlat` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `wheelchairInCityBase` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `wheelchairInCityPerKm` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `wheelchairOutCityBase` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `wheelchairOutCityPerKmOver100` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `wheelchairOutCityPerKmUnder100` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `wheelchairWaitPerHour` DECIMAL(10, 2) NOT NULL,
    MODIFY `taxRatePct` DECIMAL(5, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `trips` DROP COLUMN `requiresStairs`,
    ADD COLUMN `extraAttendant` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `extraAttendantHours` DECIMAL(5, 2) NULL,
    ADD COLUMN `isBariatric` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isOutOfCity` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isReturnLeg` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `roundTripGroupId` VARCHAR(191) NULL;
