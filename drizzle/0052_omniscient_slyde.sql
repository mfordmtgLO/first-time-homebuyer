CREATE TABLE `team_loan_officer_workspace` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`loanOfficerId` int NOT NULL,
	`memberUserId` int,
	`invitedEmail` varchar(320) NOT NULL,
	`status` enum('pending','active','suspended') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_loan_officer_workspace_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_workspace_admin_officer_unique` UNIQUE(`adminUserId`,`loanOfficerId`),
	CONSTRAINT `team_workspace_member_user_unique` UNIQUE(`memberUserId`)
);
--> statement-breakpoint
CREATE TABLE `team_template_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`channel` enum('email','text') NOT NULL,
	`name` varchar(160) NOT NULL,
	`subjectTemplate` varchar(300),
	`bodyTemplate` text NOT NULL,
	`availability` enum('private','team_read_only') NOT NULL DEFAULT 'private',
	`sourceTemplateScope` varchar(80),
	`sourceTemplateId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_template_library_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_template_admin_name_unique` UNIQUE(`adminUserId`,`channel`,`name`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','team_member') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `team_workspace_admin_status_idx` ON `team_loan_officer_workspace` (`adminUserId`,`status`);--> statement-breakpoint
CREATE INDEX `team_workspace_invited_email_idx` ON `team_loan_officer_workspace` (`invitedEmail`);--> statement-breakpoint
CREATE INDEX `team_template_admin_availability_idx` ON `team_template_library` (`adminUserId`,`availability`);