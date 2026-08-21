ALTER TABLE `platform_lead` MODIFY COLUMN `provider` enum('meta','google','manual') NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_lead` ADD `leadSource` enum('facebook','google_ads','organic');--> statement-breakpoint
ALTER TABLE `platform_lead` ADD `assignedLoanOfficerId` int;--> statement-breakpoint
ALTER TABLE `platform_lead` ADD `assignedAgentId` int;