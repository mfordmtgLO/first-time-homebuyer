CREATE TABLE `geosphere_listing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`savedPullId` int NOT NULL,
	`listingKey` varchar(320) NOT NULL,
	`externalListingId` varchar(320),
	`address` varchar(700) NOT NULL,
	`price` int,
	`bedrooms` varchar(32),
	`bathrooms` varchar(32),
	`squareFootage` int,
	`propertyType` varchar(160),
	`latitude` varchar(48),
	`longitude` varchar(48),
	`isLmi` int NOT NULL DEFAULT 0,
	`isUsda` int NOT NULL DEFAULT 0,
	`sourceData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geosphere_listing_id` PRIMARY KEY(`id`),
	CONSTRAINT `geosphere_listing_pull_key_unique` UNIQUE(`savedPullId`,`listingKey`)
);
--> statement-breakpoint
CREATE TABLE `geosphere_saved_pull` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceSnapshotId` varchar(320) NOT NULL,
	`cacheKey` varchar(320) NOT NULL,
	`areaLabel` varchar(500) NOT NULL,
	`city` varchar(180),
	`county` varchar(180),
	`zipCode` varchar(24),
	`state` varchar(8),
	`sourceSavedAt` timestamp,
	`listingCount` int NOT NULL DEFAULT 0,
	`lmiCount` int NOT NULL DEFAULT 0,
	`usdaCount` int NOT NULL DEFAULT 0,
	`lmiUsdaCount` int NOT NULL DEFAULT 0,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geosphere_saved_pull_id` PRIMARY KEY(`id`),
	CONSTRAINT `geosphere_saved_pull_source_snapshot_unique` UNIQUE(`sourceSnapshotId`)
);
--> statement-breakpoint
CREATE TABLE `geosphere_sync_setting` (
	`id` varchar(64) NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`lastSyncedAt` timestamp,
	`lastError` text,
	`lastPullCount` int NOT NULL DEFAULT 0,
	`lastListingCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geosphere_sync_setting_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `geosphere_listing_pull_overlay_idx` ON `geosphere_listing` (`savedPullId`,`isLmi`,`isUsda`);--> statement-breakpoint
CREATE INDEX `geosphere_listing_price_idx` ON `geosphere_listing` (`price`);--> statement-breakpoint
CREATE INDEX `geosphere_saved_pull_cache_key_idx` ON `geosphere_saved_pull` (`cacheKey`);--> statement-breakpoint
CREATE INDEX `geosphere_saved_pull_area_idx` ON `geosphere_saved_pull` (`state`,`city`,`county`);--> statement-breakpoint
CREATE INDEX `geosphere_sync_setting_task_uid_idx` ON `geosphere_sync_setting` (`scheduleCronTaskUid`);