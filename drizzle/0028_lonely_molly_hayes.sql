CREATE TABLE `synced_top_agent_rank_snapshot` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`syncedTopAgentId` int NOT NULL,
	`sourceRank` int,
	`rankTotal` int,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `synced_top_agent_rank_snapshot_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `synced_top_agent_rank_snapshot_owner_agent_time_idx` ON `synced_top_agent_rank_snapshot` (`ownerUserId`,`syncedTopAgentId`,`capturedAt`);