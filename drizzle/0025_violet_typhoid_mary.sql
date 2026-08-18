CREATE TABLE `synced_top_agent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`sourceKey` varchar(80) NOT NULL DEFAULT 'oregon-agent-leads',
	`sourceAgentId` int NOT NULL,
	`state` varchar(8) NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`brokerage` varchar(240),
	`cityArea` varchar(240),
	`phone` varchar(40),
	`email` varchar(320),
	`websiteBioUrl` varchar(500),
	`zillowUrl` varchar(500),
	`headshotUrl` varchar(500),
	`sourceRank` int,
	`profileData` text NOT NULL,
	`sourceUpdatedAt` timestamp,
	`createdAgentId` int,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `synced_top_agent_id` PRIMARY KEY(`id`),
	CONSTRAINT `synced_top_agent_owner_source_unique` UNIQUE(`ownerUserId`,`sourceKey`,`sourceAgentId`)
);
--> statement-breakpoint
ALTER TABLE `agent_profile` ADD `syncedTopAgentId` int;--> statement-breakpoint
CREATE INDEX `synced_top_agent_owner_state_rank_idx` ON `synced_top_agent` (`ownerUserId`,`state`,`sourceRank`);