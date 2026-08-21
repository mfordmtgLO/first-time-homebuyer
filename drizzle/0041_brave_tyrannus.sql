CREATE TABLE `directory_filter_preset` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`audience` enum('agent','loan_officer') NOT NULL,
	`name` varchar(120) NOT NULL,
	`searchQuery` varchar(300) NOT NULL DEFAULT '',
	`sortOrder` enum('last_name','recent') NOT NULL DEFAULT 'last_name',
	`principalBrokerOnly` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `directory_filter_preset_id` PRIMARY KEY(`id`),
	CONSTRAINT `directory_filter_preset_owner_audience_name_unique` UNIQUE(`ownerUserId`,`audience`,`name`)
);
--> statement-breakpoint
CREATE TABLE `directory_outreach_draft` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`audience` enum('agent','loan_officer') NOT NULL,
	`recipientId` int NOT NULL,
	`recipientName` varchar(160) NOT NULL,
	`templateId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `directory_outreach_draft_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `directory_filter_preset_owner_audience_idx` ON `directory_filter_preset` (`ownerUserId`,`audience`);--> statement-breakpoint
CREATE INDEX `directory_outreach_draft_owner_audience_recipient_time_idx` ON `directory_outreach_draft` (`ownerUserId`,`audience`,`recipientId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `directory_outreach_draft_owner_time_idx` ON `directory_outreach_draft` (`ownerUserId`,`createdAt`);