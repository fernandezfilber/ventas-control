ALTER TABLE `Receipt`
  ADD COLUMN `reminderFiveDaysSentAt` DATETIME(3) NULL,
  ADD COLUMN `reminderDueDateSentAt` DATETIME(3) NULL,
  ADD COLUMN `reminderClaimedAt` DATETIME(3) NULL,
  ADD COLUMN `reminderClaimedStage` VARCHAR(191) NULL;
