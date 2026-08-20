ALTER TABLE `listing_agent_email_template` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `property_email_template` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `property_page_agent_email_template` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `property_page_buyer_email_template` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `synced_agent_outreach_template` ADD `archivedAt` timestamp;