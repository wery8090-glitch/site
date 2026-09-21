ALTER TABLE `users` MODIFY COLUMN `role` enum('user','developer','admin','support','media','moderator') NOT NULL DEFAULT 'user';
--> statement-breakpoint
CREATE TABLE `support_tickets` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `assigneeId` int,
  `subject` varchar(160) NOT NULL,
  `category` enum('subscription','bug','account','loader','other') NOT NULL DEFAULT 'other',
  `status` enum('open','pending','closed') NOT NULL DEFAULT 'open',
  `priority` enum('low','normal','high') NOT NULL DEFAULT 'normal',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `support_tickets_user_idx` ON `support_tickets` (`userId`);
--> statement-breakpoint
CREATE INDEX `support_tickets_status_idx` ON `support_tickets` (`status`);
--> statement-breakpoint
CREATE INDEX `support_tickets_assignee_idx` ON `support_tickets` (`assigneeId`);
--> statement-breakpoint
CREATE INDEX `support_tickets_updated_idx` ON `support_tickets` (`updatedAt`);
--> statement-breakpoint
CREATE TABLE `support_messages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `ticketId` int NOT NULL,
  `authorId` int NOT NULL,
  `body` text NOT NULL,
  `internal` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `support_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `support_messages_ticket_idx` ON `support_messages` (`ticketId`);
--> statement-breakpoint
CREATE INDEX `support_messages_author_idx` ON `support_messages` (`authorId`);
--> statement-breakpoint
CREATE INDEX `support_messages_created_idx` ON `support_messages` (`createdAt`);
--> statement-breakpoint
INSERT INTO `subscription_plans` (`name`,`slug`,`description`,`price`,`currency`,`durationDays`,`deviceLimit`,`features`,`active`)
VALUES
('TESTER','tester','Custom testing access for QA accounts.',0,'RUB',30,3,'["Testing builds","QA access","Support priority"]',true),
('MEDIA','media','Custom media access for partners and creators.',0,'RUB',30,5,'["Media builds","Partner access","Creator support"]',true)
ON DUPLICATE KEY UPDATE `active`=true, `updatedAt`=CURRENT_TIMESTAMP;
