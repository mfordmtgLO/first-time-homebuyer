CREATE TABLE `email_template_version` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateScope` enum('listing_agent','property_list','property_page_agent','property_page_buyer','oregon_outreach') NOT NULL,
	`templateId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`subjectTemplate` varchar(300),
	`bodyTemplate` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_template_version_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_template_version_scope_template_number_unique` UNIQUE(`templateScope`,`templateId`,`versionNumber`)
);
--> statement-breakpoint
CREATE INDEX `email_template_version_owner_idx` ON `email_template_version` (`ownerUserId`);