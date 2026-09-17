ALTER TABLE `subscription_keys`
  ADD COLUMN `expiresAt` timestamp NULL AFTER `durationDays`;
UPDATE `subscription_keys`
  SET `expiresAt` = DATE_ADD(`createdAt`, INTERVAL `durationDays` DAY)
  WHERE `expiresAt` IS NULL;
ALTER TABLE `subscription_keys`
  MODIFY COLUMN `expiresAt` timestamp NOT NULL,
  MODIFY COLUMN `status` enum('available','redeemed','revoked','expired') NOT NULL DEFAULT 'available';
CREATE INDEX `subscription_keys_expires_idx` ON `subscription_keys` (`expiresAt`);
