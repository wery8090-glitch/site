ALTER TABLE `client_versions`
  ADD COLUMN `requiredPlan` varchar(64) NOT NULL DEFAULT 'free' AFTER `releaseNotes`;
CREATE INDEX `client_versions_required_plan_idx` ON `client_versions` (`requiredPlan`, `active`);
