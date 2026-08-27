CREATE TABLE `advertising_integration_setting` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`provider` enum('meta','google_ads') NOT NULL,
	`setupStage` enum('not_started','details_saved','compliance_pending','approved_not_connected') NOT NULL DEFAULT 'not_started',
	`accountReference` varchar(180),
	`formReference` varchar(240),
	`internalNote` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `advertising_integration_setting_id` PRIMARY KEY(`id`),
	CONSTRAINT `advertising_integration_owner_provider_unique` UNIQUE(`ownerUserId`,`provider`)
);
