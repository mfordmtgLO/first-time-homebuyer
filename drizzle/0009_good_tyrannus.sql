ALTER TABLE `chat_intake_lead` ADD `lowDownPaymentHomeSearch` int;--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `targetArea` varchar(240);--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `resendCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `lastResentAt` timestamp;