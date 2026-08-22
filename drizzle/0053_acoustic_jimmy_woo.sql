CREATE TABLE `team_template_submission` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`memberUserId` int NOT NULL,
	`loanOfficerId` int NOT NULL,
	`channel` enum('email','text') NOT NULL,
	`name` varchar(160) NOT NULL,
	`subjectTemplate` varchar(300),
	`bodyTemplate` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewerNote` text,
	`reviewedAt` timestamp,
	`approvedLibraryTemplateId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_template_submission_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `team_template_submission_admin_status_idx` ON `team_template_submission` (`adminUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `team_template_submission_member_idx` ON `team_template_submission` (`memberUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `team_template_submission_officer_idx` ON `team_template_submission` (`loanOfficerId`,`createdAt`);