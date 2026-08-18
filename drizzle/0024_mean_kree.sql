CREATE TABLE `lo_agent_spend_entry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pairingId` int NOT NULL,
	`spentOn` timestamp NOT NULL,
	`category` enum('ad_spend','event','print','digital','other') NOT NULL,
	`description` varchar(300) NOT NULL,
	`loanOfficerCents` int NOT NULL DEFAULT 0,
	`agentCents` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lo_agent_spend_entry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lo_agent_spend_pairing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`loanOfficerId` int NOT NULL,
	`agentId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lo_agent_spend_pairing_id` PRIMARY KEY(`id`),
	CONSTRAINT `lo_agent_spend_pairing_owner_unique` UNIQUE(`ownerUserId`,`loanOfficerId`,`agentId`)
);
--> statement-breakpoint
CREATE INDEX `lo_agent_spend_entry_pairing_date_idx` ON `lo_agent_spend_entry` (`pairingId`,`spentOn`);--> statement-breakpoint
CREATE INDEX `lo_agent_spend_pairing_owner_idx` ON `lo_agent_spend_pairing` (`ownerUserId`);