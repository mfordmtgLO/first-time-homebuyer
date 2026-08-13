-- The independent project copy started with a partial schema even though the
-- copied Drizzle model already expected these non-destructive columns.
ALTER TABLE `leads` ADD COLUMN `loanOfficerId` int;
ALTER TABLE `loan_officer`
  ADD COLUMN `slug` varchar(160) NOT NULL DEFAULT '',
  ADD COLUMN `companyName` varchar(200) NOT NULL DEFAULT '',
  ADD COLUMN `bio` text,
  ADD COLUMN `website` varchar(500) NOT NULL DEFAULT '',
  ADD COLUMN `headshotUrl` varchar(500) NOT NULL DEFAULT '',
  ADD COLUMN `companyLogoUrl` varchar(500) NOT NULL DEFAULT '',
  ADD COLUMN `agentId` int;
