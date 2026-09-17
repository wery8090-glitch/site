ALTER TABLE `subscription_keys`
  ADD COLUMN `maxActivations` int NOT NULL DEFAULT 1 AFTER `expiresAt`,
  ADD COLUMN `usedActivations` int NOT NULL DEFAULT 0 AFTER `maxActivations`;
CREATE INDEX `subscription_keys_activation_idx` ON `subscription_keys` (`usedActivations`, `maxActivations`);
