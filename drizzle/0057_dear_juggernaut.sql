CREATE TABLE `advertising_integration_module_setting` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`isVisible` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `advertising_integration_module_setting_id` PRIMARY KEY(`id`),
	CONSTRAINT `advertising_integration_module_owner_unique` UNIQUE(`ownerUserId`)
);
