CREATE TABLE `campaign_spend_entry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`utmSource` varchar(120) NOT NULL,
	`utmMedium` varchar(120) NOT NULL,
	`utmCampaign` varchar(160) NOT NULL,
	`spentOn` timestamp NOT NULL,
	`spendCents` int NOT NULL,
	`notes` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_spend_entry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `campaign_spend_entry_owner_date_idx` ON `campaign_spend_entry` (`ownerUserId`,`spentOn`);--> statement-breakpoint
CREATE INDEX `campaign_spend_entry_owner_campaign_idx` ON `campaign_spend_entry` (`ownerUserId`,`utmSource`,`utmMedium`,`utmCampaign`);