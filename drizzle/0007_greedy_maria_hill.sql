CREATE TABLE `chat_intake_lead` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(72) NOT NULL,
	`status` enum('incomplete','qualified') NOT NULL DEFAULT 'incomplete',
	`currentStep` varchar(64) NOT NULL DEFAULT 'loan_purpose',
	`loanPurpose` enum('purchase','refinance'),
	`propertyType` varchar(80),
	`propertyValue` int,
	`creditRange` varchar(80),
	`annualIncome` int,
	`downPayment` int,
	`loanAmount` int,
	`fullName` varchar(180),
	`email` varchar(320),
	`phone` varchar(40),
	`agentId` int,
	`loanOfficerId` int,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_intake_lead_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_intake_lead_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `chat_transcript` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatLeadId` int NOT NULL,
	`role` enum('assistant','user','system') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_transcript_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loan_officer` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL DEFAULT '',
	`email` varchar(320) NOT NULL DEFAULT '',
	`phone` varchar(40) NOT NULL DEFAULT '',
	`nmls` varchar(40) NOT NULL DEFAULT '',
	`title` varchar(120) NOT NULL DEFAULT 'Loan Officer',
	`visible` int NOT NULL DEFAULT 1,
	`featured` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loan_officer_id` PRIMARY KEY(`id`)
);
