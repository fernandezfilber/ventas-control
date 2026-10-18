CREATE TABLE `PaymentProof` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `messageId` VARCHAR(191) NOT NULL,
  `clientUserId` INTEGER NULL,
  `candidateReceiptId` INTEGER NULL,
  `senderPhone` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `imageBase64` LONGTEXT NOT NULL,
  `caption` TEXT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING_REVIEW',
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt` DATETIME(3) NULL,
  `reviewedByUserId` INTEGER NULL,

  UNIQUE INDEX `PaymentProof_messageId_key`(`messageId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PaymentProof_clientUserId_fkey` FOREIGN KEY (`clientUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `PaymentProof_candidateReceiptId_fkey` FOREIGN KEY (`candidateReceiptId`) REFERENCES `Receipt`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `PaymentProof_clientUserId_status_receivedAt_idx`
  ON `PaymentProof`(`clientUserId`, `status`, `receivedAt`);
CREATE INDEX `PaymentProof_candidateReceiptId_idx`
  ON `PaymentProof`(`candidateReceiptId`);
