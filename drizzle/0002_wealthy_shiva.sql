CREATE TABLE `loader_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`nonce` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loader_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `device_link_codes` MODIFY COLUMN `publicKey` varchar(512) NOT NULL;--> statement-breakpoint
ALTER TABLE `devices` MODIFY COLUMN `publicKey` varchar(512) NOT NULL;--> statement-breakpoint
CREATE INDEX `loader_challenges_device_idx` ON `loader_challenges` (`deviceId`);--> statement-breakpoint
CREATE INDEX `loader_challenges_expires_idx` ON `loader_challenges` (`expiresAt`);