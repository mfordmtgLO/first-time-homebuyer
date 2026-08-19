CREATE TABLE `synced_agent_outreach_template` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`subjectTemplate` varchar(240) NOT NULL,
	`bodyTemplate` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `synced_agent_outreach_template_id` PRIMARY KEY(`id`),
	CONSTRAINT `synced_agent_outreach_template_owner_name_unique` UNIQUE(`ownerUserId`,`name`)
);
--> statement-breakpoint
CREATE INDEX `synced_agent_outreach_template_owner_idx` ON `synced_agent_outreach_template` (`ownerUserId`);