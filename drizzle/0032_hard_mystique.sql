CREATE TABLE `property_page_buyer_email_template` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`subjectTemplate` varchar(300) NOT NULL,
	`bodyTemplate` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_page_buyer_email_template_id` PRIMARY KEY(`id`),
	CONSTRAINT `property_page_buyer_email_template_owner_name_unique` UNIQUE(`ownerUserId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `property_page_activity` MODIFY COLUMN `eventType` enum('page_view','buydown_calculator','cost_of_waiting_calculator','roadmap_request','chat_started','chat_completed','homes_list_request','buyer_agent_request','social_share','print_export','email_pdf_summary') NOT NULL;--> statement-breakpoint
CREATE INDEX `property_page_buyer_email_template_owner_idx` ON `property_page_buyer_email_template` (`ownerUserId`);