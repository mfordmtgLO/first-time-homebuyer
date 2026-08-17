CREATE TABLE `property_landing_page` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(240) NOT NULL,
	`geosphereListingId` int NOT NULL,
	`savedPullId` int NOT NULL,
	`loanOfficerId` int,
	`agentId` int,
	`address` varchar(700) NOT NULL,
	`listingSnapshot` text NOT NULL,
	`sourceSavedAt` timestamp,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_landing_page_id` PRIMARY KEY(`id`),
	CONSTRAINT `property_landing_page_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `property_landing_page_listing_unique` UNIQUE(`geosphereListingId`)
);
--> statement-breakpoint
CREATE TABLE `property_page_agent_email_template` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`bodyTemplate` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_page_agent_email_template_id` PRIMARY KEY(`id`),
	CONSTRAINT `property_page_agent_email_template_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `propertyPageId` int;--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `scenario` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `propertyPageId` int;--> statement-breakpoint
CREATE INDEX `property_landing_page_pair_idx` ON `property_landing_page` (`loanOfficerId`,`agentId`);