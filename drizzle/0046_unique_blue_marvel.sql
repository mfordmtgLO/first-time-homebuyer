ALTER TABLE `platform_lead` ADD `followUpAt` timestamp;--> statement-breakpoint
ALTER TABLE `platform_lead` ADD `followUpChannel` enum('phone','text','email','listings','agent_connection','roadmap');--> statement-breakpoint
ALTER TABLE `platform_lead` ADD `followUpCompletedAt` timestamp;