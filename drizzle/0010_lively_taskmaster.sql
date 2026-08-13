ALTER TABLE `leads` ADD `loanOfficerId` int;--> statement-breakpoint
ALTER TABLE `loan_officer` ADD `slug` varchar(160) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `loan_officer` ADD `companyName` varchar(200) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `loan_officer` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `loan_officer` ADD `website` varchar(500) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `loan_officer` ADD `headshotUrl` varchar(500) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `loan_officer` ADD `companyLogoUrl` varchar(500) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `loan_officer` ADD `agentId` int;
--> statement-breakpoint
ALTER TABLE `leads` ADD `loanOfficerId` int;
