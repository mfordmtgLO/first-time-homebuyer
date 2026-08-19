CREATE TABLE `property_engagement_setting` (
	`ownerUserId` int NOT NULL,
	`highActivityThreshold` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_engagement_setting_ownerUserId` PRIMARY KEY(`ownerUserId`)
);
