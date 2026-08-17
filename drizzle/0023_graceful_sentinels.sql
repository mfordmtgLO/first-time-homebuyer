CREATE TABLE `property_page_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyLandingPageId` int NOT NULL,
	`eventType` enum('page_view','buydown_calculator','cost_of_waiting_calculator','roadmap_request','chat_started','chat_completed','homes_list_request','buyer_agent_request','social_share','print_export') NOT NULL,
	`detail` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `property_page_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `property_landing_page` ADD `aiSummary` text;--> statement-breakpoint
ALTER TABLE `property_landing_page` ADD `aiSummaryUpdatedAt` timestamp;--> statement-breakpoint
CREATE INDEX `property_page_activity_page_time_idx` ON `property_page_activity` (`propertyLandingPageId`,`createdAt`);