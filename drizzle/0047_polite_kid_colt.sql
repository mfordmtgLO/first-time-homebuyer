CREATE TABLE `platform_lead_outreach_template` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`audience` enum('lead','agent') NOT NULL,
	`name` varchar(160) NOT NULL,
	`subjectTemplate` varchar(300) NOT NULL,
	`bodyTemplate` text NOT NULL,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_lead_outreach_template_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_lead_outreach_template_owner_audience_name_unique` UNIQUE(`ownerUserId`,`audience`,`name`)
);
--> statement-breakpoint
CREATE INDEX `platform_lead_outreach_template_owner_audience_idx` ON `platform_lead_outreach_template` (`ownerUserId`,`audience`);