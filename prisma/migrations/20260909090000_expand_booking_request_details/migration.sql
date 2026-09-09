-- Capture the complete patient transport request while retaining legacy care flags
-- for existing dispatch, driver and pricing workflows.
ALTER TABLE `trips`
  ADD COLUMN `pickupFacilityName` VARCHAR(191) NULL,
  ADD COLUMN `dropoffFacilityName` VARCHAR(191) NULL,
  ADD COLUMN `oxygenRequirement` ENUM('NO', 'YES', 'NOT_SURE') NOT NULL DEFAULT 'NO',
  ADD COLUMN `oxygenLitresPerMinute` DECIMAL(5, 2) NULL,
  ADD COLUMN `isolationRequirement` ENUM('NO', 'YES', 'NOT_SURE') NOT NULL DEFAULT 'NO',
  ADD COLUMN `isolationDetails` VARCHAR(191) NULL,
  ADD COLUMN `dnrRequirement` ENUM('NO', 'YES', 'NOT_SURE') NOT NULL DEFAULT 'NO',
  ADD COLUMN `hasBelongings` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `belongingsDescription` TEXT NULL,
  MODIFY COLUMN `paymentPreference` ENUM('CASH', 'CARD', 'E_TRANSFER', 'DIRECT_DEPOSIT', 'INVOICE', 'INSURANCE', 'OPGT', 'OTHER') NULL;

-- Preserve the meaning of care requirements captured before this migration.
UPDATE `trips`
SET
  `oxygenRequirement` = IF(`requiresOxygen`, 'YES', 'NO'),
  `isolationRequirement` = IF(`requiresIsolation`, 'YES', 'NO'),
  `dnrRequirement` = IF(`hasDnr`, 'YES', 'NO');
