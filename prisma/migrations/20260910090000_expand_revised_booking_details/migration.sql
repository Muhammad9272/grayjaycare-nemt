ALTER TABLE `trips`
  ADD COLUMN `patientOver250` ENUM('NO', 'YES', 'NOT_SURE') NOT NULL DEFAULT 'NOT_SURE',
  ADD COLUMN `passengerWeightValue` DECIMAL(7,2) NULL,
  ADD COLUMN `passengerWeightUnit` ENUM('LB', 'KG') NULL,
  ADD COLUMN `specialAssistance` ENUM('NO', 'STAIR_CHAIR', 'BARIATRIC', 'NOT_SURE') NOT NULL DEFAULT 'NO',
  ADD COLUMN `stairChairWeightEligible` ENUM('NO', 'YES', 'NOT_SURE') NULL,
  ADD COLUMN `dnrDocumentationConfirmed` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `belongingsRequirement` ENUM('NO', 'YES', 'NOT_SURE') NOT NULL DEFAULT 'NO',
  ADD COLUMN `invoiceRecipient` VARCHAR(191) NULL,
  ADD COLUMN `invoiceName` VARCHAR(191) NULL,
  ADD COLUMN `invoiceEmail` VARCHAR(191) NULL,
  ADD COLUMN `billingAddress` TEXT NULL,
  ADD COLUMN `billingOrganization` VARCHAR(191) NULL,
  ADD COLUMN `billingAccountNumber` VARCHAR(191) NULL,
  ADD COLUMN `billingContactPerson` VARCHAR(191) NULL,
  ADD COLUMN `purchaseOrderReference` VARCHAR(191) NULL,
  ADD COLUMN `insuranceCompany` VARCHAR(191) NULL,
  ADD COLUMN `insuranceClaimNumber` VARCHAR(191) NULL,
  ADD COLUMN `insurancePolicyNumber` VARCHAR(191) NULL,
  ADD COLUMN `opgtClientInformation` TEXT NULL,
  ADD COLUMN `opgtContactPerson` VARCHAR(191) NULL,
  ADD COLUMN `otherPaymentDetails` TEXT NULL;

ALTER TABLE `trips`
  MODIFY COLUMN `paymentPreference` ENUM('CASH', 'CARD', 'E_TRANSFER', 'DIRECT_DEPOSIT', 'INVOICE', 'DIRECT_BILLING', 'INSURANCE', 'OPGT', 'OTHER') NULL;
