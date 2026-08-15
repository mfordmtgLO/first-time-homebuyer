ALTER TABLE `geosphere_listing` ADD `lastEmailSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `geosphere_listing` ADD `lastEmailTemplateName` varchar(160);--> statement-breakpoint
ALTER TABLE `geosphere_listing` ADD `emailResendCount` int DEFAULT 0 NOT NULL;