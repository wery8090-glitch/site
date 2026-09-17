CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(96) NOT NULL,
	`metadata` text,
	`ipHash` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`version` varchar(32) NOT NULL,
	`minecraftVersion` varchar(32) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileName` varchar(160) NOT NULL,
	`releaseNotes` text NOT NULL,
	`isLatest` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_versions_version_unique` UNIQUE(`version`)
);
--> statement-breakpoint
CREATE TABLE `device_link_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`deviceName` varchar(120) NOT NULL,
	`publicKey` varchar(160) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_link_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_link_codes_hash_unique` UNIQUE(`codeHash`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`publicKey` varchar(160) NOT NULL,
	`status` enum('active','disabled','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp,
	`revokedAt` timestamp,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `devices_public_key_unique` UNIQUE(`publicKey`)
);
--> statement-breakpoint
CREATE TABLE `downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` int,
	`versionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`ipHash` varchar(128),
	CONSTRAINT `downloads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loader_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`lastSeenAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loader_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `loader_sessions_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_resets_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_resets_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriptionId` int,
	`provider` varchar(48) NOT NULL,
	`providerPaymentId` varchar(160),
	`amount` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'RUB',
	`status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`paidAt` timestamp,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`price` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'RUB',
	`durationDays` int NOT NULL,
	`deviceLimit` int NOT NULL DEFAULT 1,
	`features` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_plans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int NOT NULL,
	`status` enum('active','expired','cancelled','pending') NOT NULL DEFAULT 'pending',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`provider` varchar(48),
	`providerSubscriptionId` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','moderator','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(48);--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','suspended','banned') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastLoginAt` timestamp;--> statement-breakpoint
CREATE INDEX `audit_logs_user_idx` ON `audit_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `client_versions_latest_idx` ON `client_versions` (`isLatest`,`active`);--> statement-breakpoint
CREATE INDEX `device_link_codes_expires_idx` ON `device_link_codes` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `devices_user_idx` ON `devices` (`userId`);--> statement-breakpoint
CREATE INDEX `devices_status_idx` ON `devices` (`status`);--> statement-breakpoint
CREATE INDEX `downloads_user_idx` ON `downloads` (`userId`);--> statement-breakpoint
CREATE INDEX `downloads_version_idx` ON `downloads` (`versionId`);--> statement-breakpoint
CREATE INDEX `loader_sessions_device_idx` ON `loader_sessions` (`deviceId`);--> statement-breakpoint
CREATE INDEX `loader_sessions_expires_idx` ON `loader_sessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `password_resets_user_idx` ON `password_resets` (`userId`);--> statement-breakpoint
CREATE INDEX `payments_user_idx` ON `payments` (`userId`);--> statement-breakpoint
CREATE INDEX `payments_provider_idx` ON `payments` (`providerPaymentId`);--> statement-breakpoint
CREATE INDEX `subscription_plans_active_idx` ON `subscription_plans` (`active`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_status_idx` ON `subscriptions` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_ends_at_idx` ON `subscriptions` (`endsAt`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);