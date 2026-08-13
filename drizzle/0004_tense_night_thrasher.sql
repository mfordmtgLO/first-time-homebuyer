CREATE TABLE `agent_profile` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL DEFAULT '',
	`email` varchar(320) NOT NULL DEFAULT '',
	`phone` varchar(40) NOT NULL DEFAULT '',
	`bio` text,
	`website` varchar(500) NOT NULL DEFAULT '',
	`companyName` varchar(200) NOT NULL DEFAULT '',
	`headshotUrl` varchar(500) NOT NULL DEFAULT '',
	`companyLogoUrl` varchar(500) NOT NULL DEFAULT '',
	`visible` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_profile_id` PRIMARY KEY(`id`)
);
