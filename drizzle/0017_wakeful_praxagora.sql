CREATE TABLE `text_chain_attachment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`textChainEventId` int NOT NULL,
	`storageKey` varchar(700) NOT NULL,
	`url` varchar(1000) NOT NULL,
	`fileName` varchar(300) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `text_chain_attachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `text_chain_event` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceType` enum('roadmap','chat') NOT NULL,
	`sourceLeadId` int NOT NULL,
	`direction` enum('incoming','outgoing') NOT NULL,
	`body` text NOT NULL,
	`eventStatus` enum('queued','sent','delivered','failed','received','opted_out') NOT NULL DEFAULT 'received',
	`senderLabel` varchar(180),
	`providerName` varchar(80),
	`providerMessageId` varchar(160),
	`textMessageId` int,
	`textMessageRecipientId` int,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `text_chain_event_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `text_chain_attachment_event_idx` ON `text_chain_attachment` (`textChainEventId`);--> statement-breakpoint
CREATE INDEX `text_chain_event_source_time_idx` ON `text_chain_event` (`sourceType`,`sourceLeadId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `text_chain_event_provider_id_idx` ON `text_chain_event` (`providerName`,`providerMessageId`);