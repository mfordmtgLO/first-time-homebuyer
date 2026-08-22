ALTER TABLE `team_loan_officer_workspace` ADD `setupStatus` enum('draft','prepared','handed_off') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `team_loan_officer_workspace` ADD `templateLibraryPreparedAt` timestamp;--> statement-breakpoint
ALTER TABLE `team_loan_officer_workspace` ADD `geospherePreparedAt` timestamp;--> statement-breakpoint
ALTER TABLE `team_loan_officer_workspace` ADD `oregonAgentPreparedAt` timestamp;--> statement-breakpoint
ALTER TABLE `team_loan_officer_workspace` ADD `handoffReleasedAt` timestamp;--> statement-breakpoint
ALTER TABLE `team_loan_officer_workspace` ADD `handoffNote` text;