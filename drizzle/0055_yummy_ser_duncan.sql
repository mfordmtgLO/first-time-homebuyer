CREATE TABLE `backup_history_event` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`eventType` enum('backup_created','restore_confirmed') NOT NULL,
	`label` varchar(180) NOT NULL,
	`packageReference` varchar(300),
	`notes` text,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backup_history_event_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `backup_history_event_owner_occurred_idx` ON `backup_history_event` (`ownerUserId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `backup_history_event_owner_type_idx` ON `backup_history_event` (`ownerUserId`,`eventType`);