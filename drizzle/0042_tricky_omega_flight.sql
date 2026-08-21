CREATE TABLE `platform_lead` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`provider` enum('meta','google') NOT NULL,
	`externalLeadId` varchar(255) NOT NULL,
	`status` enum('test','new','archived') NOT NULL DEFAULT 'new',
	`firstName` varchar(120) NOT NULL DEFAULT '',
	`lastName` varchar(120) NOT NULL DEFAULT '',
	`fullName` varchar(240) NOT NULL DEFAULT '',
	`email` varchar(320) NOT NULL DEFAULT '',
	`phone` varchar(40) NOT NULL DEFAULT '',
	`consentText` text,
	`externalPageId` varchar(80),
	`externalFormId` varchar(80),
	`externalCampaignId` varchar(80),
	`externalAdSetId` varchar(80),
	`externalAdId` varchar(80),
	`externalCreativeId` varchar(80),
	`googleClickId` varchar(255),
	`providerSubmittedAt` timestamp,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_lead_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_lead_provider_external_unique` UNIQUE(`provider`,`externalLeadId`)
);
--> statement-breakpoint
CREATE INDEX `platform_lead_owner_received_idx` ON `platform_lead` (`ownerUserId`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `platform_lead_owner_status_idx` ON `platform_lead` (`ownerUserId`,`status`);