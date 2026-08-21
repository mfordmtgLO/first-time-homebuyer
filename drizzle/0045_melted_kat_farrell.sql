CREATE TABLE `platform_lead_note` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`platformLeadId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_lead_note_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_lead_progress_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`statusKey` varchar(80) NOT NULL,
	`label` varchar(80) NOT NULL,
	`color` enum('slate','blue','amber','violet','emerald','rose') NOT NULL DEFAULT 'slate',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_lead_progress_status_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_lead_progress_status_owner_key_unique` UNIQUE(`ownerUserId`,`statusKey`)
);
--> statement-breakpoint
ALTER TABLE `platform_lead` ADD `progressStatus` varchar(80) DEFAULT 'new' NOT NULL;--> statement-breakpoint
CREATE INDEX `platform_lead_note_owner_lead_time_idx` ON `platform_lead_note` (`ownerUserId`,`platformLeadId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `platform_lead_progress_status_owner_sort_idx` ON `platform_lead_progress_status` (`ownerUserId`,`sortOrder`);