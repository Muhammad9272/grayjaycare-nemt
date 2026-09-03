-- Add complete contact, facility and patient-care details captured by booking forms.
ALTER TABLE `trips`
  ADD COLUMN `contactName` VARCHAR(191) NULL,
  ADD COLUMN `contactPhoneExtension` VARCHAR(191) NULL,
  ADD COLUMN `medicalRecordNumber` VARCHAR(191) NULL,
  ADD COLUMN `pickupDepartment` VARCHAR(191) NULL,
  ADD COLUMN `pickupRoom` VARCHAR(191) NULL,
  ADD COLUMN `dropoffDepartment` VARCHAR(191) NULL,
  ADD COLUMN `dropoffRoom` VARCHAR(191) NULL,
  ADD COLUMN `pickupTimePreference` ENUM('SPECIFIC', 'ASAP', 'FLEXIBLE') NOT NULL DEFAULT 'SPECIFIC',
  ADD COLUMN `returnTripType` ENUM('ONE_WAY', 'SCHEDULED_RETURN', 'WAIT_AND_RETURN', 'CALL_FOR_RETURN') NOT NULL DEFAULT 'ONE_WAY',
  ADD COLUMN `requiresIsolation` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `hasDnr` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `escortCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `paymentPreference` ENUM('CASH', 'CARD', 'E_TRANSFER', 'DIRECT_DEPOSIT', 'INVOICE', 'OTHER') NULL,
  ADD COLUMN `medicalDocumentsAvailable` BOOLEAN NOT NULL DEFAULT false;
