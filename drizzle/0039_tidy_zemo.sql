CREATE TABLE `program_contribution_limit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`programKey` enum('fha','va','usda','conventional_primary','conventional_second_home','conventional_investment','conventional_ltv81_90','conventional_gt90') NOT NULL,
	`percentBps` int NOT NULL,
	`dollarCapCents` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `program_contribution_limit_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_contribution_limit_owner_program_unique` UNIQUE(`ownerUserId`,`programKey`)
);
--> statement-breakpoint
CREATE INDEX `program_contribution_limit_owner_idx` ON `program_contribution_limit` (`ownerUserId`);