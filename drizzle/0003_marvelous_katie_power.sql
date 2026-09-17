ALTER TABLE `subscriptions` MODIFY COLUMN `provider` enum('FunPay','Telegram','Manual');--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `adminNote` text;