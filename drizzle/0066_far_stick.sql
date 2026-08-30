CREATE TABLE `dashboard_layout_preference` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`commandCenterWidgetOrder` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dashboard_layout_preference_id` PRIMARY KEY(`id`),
	CONSTRAINT `dashboard_layout_preference_owner_unique` UNIQUE(`ownerUserId`)
);
