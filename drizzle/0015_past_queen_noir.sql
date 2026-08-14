CREATE TABLE `text_message` (
	`id` int AUTO_INCREMENT NOT NULL,
	`body` text NOT NULL,
	`providerMode` enum('draft','provider_setup_required','sent','failed') NOT NULL DEFAULT 'draft',
	`providerName` varchar(80),
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `text_message_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `text_message_attachment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`textMessageId` int NOT NULL,
	`storageKey` varchar(700) NOT NULL,
	`url` varchar(1000) NOT NULL,
	`fileName` varchar(300) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `text_message_attachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `text_message_recipient` (
	`id` int AUTO_INCREMENT NOT NULL,
	`textMessageId` int NOT NULL,
	`sourceType` enum('roadmap','chat') NOT NULL,
	`sourceLeadId` int NOT NULL,
	`recipientName` varchar(180) NOT NULL,
	`recipientPhone` varchar(40) NOT NULL,
	`deliveryStatus` enum('draft','provider_setup_required','sent','failed','opted_out') NOT NULL DEFAULT 'draft',
	`providerMessageId` varchar(160),
	`deliveryDetail` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `text_message_recipient_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `smsConsent` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_intake_lead` ADD `smsConsentAt` timestamp;--> statement-breakpoint
CREATE INDEX `text_message_attachment_message_idx` ON `text_message_attachment` (`textMessageId`);--> statement-breakpoint
CREATE INDEX `text_message_recipient_message_idx` ON `text_message_recipient` (`textMessageId`);--> statement-breakpoint
CREATE INDEX `text_message_recipient_source_idx` ON `text_message_recipient` (`sourceType`,`sourceLeadId`);