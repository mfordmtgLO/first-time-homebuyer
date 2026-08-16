ALTER TABLE `chat_intake_lead` ADD `buyerAgentRequest` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `buyerAgentRequestedAt` timestamp;--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `utmSource` varchar(120);--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `utmMedium` varchar(120);--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `utmCampaign` varchar(160);--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `utmContent` varchar(160);--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `utmTerm` varchar(160);--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `landingPath` varchar(500);--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `referrerHost` varchar(320);--> statement-breakpoint
ALTER TABLE `leads` ADD `utmSource` varchar(120);--> statement-breakpoint
ALTER TABLE `leads` ADD `utmMedium` varchar(120);--> statement-breakpoint
ALTER TABLE `leads` ADD `utmCampaign` varchar(160);--> statement-breakpoint
ALTER TABLE `leads` ADD `utmContent` varchar(160);--> statement-breakpoint
ALTER TABLE `leads` ADD `utmTerm` varchar(160);--> statement-breakpoint
ALTER TABLE `leads` ADD `landingPath` varchar(500);--> statement-breakpoint
ALTER TABLE `leads` ADD `referrerHost` varchar(320);