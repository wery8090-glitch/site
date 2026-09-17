CREATE TABLE `visuals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(96) NOT NULL,
  `slug` varchar(96) NOT NULL,
  `description` text NOT NULL,
  `version` varchar(32) NOT NULL,
  `fileKey` varchar(512) NOT NULL,
  `minecraftVersion` varchar(32) NOT NULL,
  `active` boolean NOT NULL DEFAULT true,
  `featured` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `visuals_pk` PRIMARY KEY(`id`),
  CONSTRAINT `visuals_slug_unique` UNIQUE(`slug`)
);
CREATE INDEX `visuals_active_idx` ON `visuals` (`active`);
