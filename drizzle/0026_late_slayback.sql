CREATE TABLE `synced_top_agent_review` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`syncedTopAgentId` int NOT NULL,
	`agentId` int NOT NULL,
	`previousProfileData` text NOT NULL,
	`proposedProfileData` text NOT NULL,
	`changedFields` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `synced_top_agent_review_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `synced_top_agent` ADD `hasPendingReview` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `synced_top_agent_review_owner_status_idx` ON `synced_top_agent_review` (`ownerUserId`,`status`);--> statement-breakpoint
CREATE INDEX `synced_top_agent_review_profile_idx` ON `synced_top_agent_review` (`syncedTopAgentId`);