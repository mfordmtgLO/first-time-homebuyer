CREATE TABLE `email_template_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateScope` enum('listing_agent','property_list','property_page_agent','property_page_buyer','oregon_outreach') NOT NULL,
	`templateId` int NOT NULL,
	`ownerUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_template_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `email_template_usage_scope_template_idx` ON `email_template_usage` (`templateScope`,`templateId`);--> statement-breakpoint
CREATE INDEX `email_template_usage_owner_idx` ON `email_template_usage` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `email_template_usage_created_idx` ON `email_template_usage` (`createdAt`);