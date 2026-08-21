CREATE TABLE `directory_outreach_email_template` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`audience` enum('agent','loan_officer') NOT NULL,
	`name` varchar(160) NOT NULL,
	`subjectTemplate` varchar(300) NOT NULL,
	`bodyTemplate` text NOT NULL,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `directory_outreach_email_template_id` PRIMARY KEY(`id`),
	CONSTRAINT `directory_outreach_email_template_owner_audience_name_unique` UNIQUE(`ownerUserId`,`audience`,`name`)
);
--> statement-breakpoint
ALTER TABLE `email_template_usage` MODIFY COLUMN `templateScope` enum('listing_agent','property_list','property_page_agent','property_page_buyer','oregon_outreach','agent_directory','loan_officer_directory') NOT NULL;--> statement-breakpoint
ALTER TABLE `email_template_version` MODIFY COLUMN `templateScope` enum('listing_agent','property_list','property_page_agent','property_page_buyer','oregon_outreach','agent_directory','loan_officer_directory') NOT NULL;--> statement-breakpoint
CREATE INDEX `directory_outreach_email_template_owner_audience_idx` ON `directory_outreach_email_template` (`ownerUserId`,`audience`);