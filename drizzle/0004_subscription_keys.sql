CREATE TABLE `subscription_keys` (
  `id` int AUTO_INCREMENT NOT NULL,
  `keyHash` varchar(128) NOT NULL,
  `planId` int NOT NULL,
  `durationDays` int NOT NULL,
  `status` enum('available','redeemed','revoked') NOT NULL DEFAULT 'available',
  `redeemedByUserId` int,
  `redeemedAt` timestamp,
  `createdByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `subscription_keys_id` PRIMARY KEY(`id`),
  CONSTRAINT `subscription_keys_hash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE INDEX `subscription_keys_status_idx` ON `subscription_keys` (`status`);
--> statement-breakpoint
CREATE INDEX `subscription_keys_plan_idx` ON `subscription_keys` (`planId`);
