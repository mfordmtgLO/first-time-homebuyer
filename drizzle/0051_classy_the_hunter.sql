CREATE TABLE `workflow_ai_review_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`section` varchar(80) NOT NULL,
	`headline` varchar(220) NOT NULL,
	`recordsSnapshot` text NOT NULL,
	`actionsSnapshot` text NOT NULL,
	`status` enum('open','completed','deferred') NOT NULL DEFAULT 'open',
	`feedback` enum('useful','needs_tuning','not_useful'),
	`ownerNote` varchar(800),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_ai_review_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `workflow_ai_review_history_owner_created_idx` ON `workflow_ai_review_history` (`ownerUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `workflow_ai_review_history_owner_section_idx` ON `workflow_ai_review_history` (`ownerUserId`,`section`);