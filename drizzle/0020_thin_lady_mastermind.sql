CREATE TABLE `property_email_template` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`bodyTemplate` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_email_template_id` PRIMARY KEY(`id`),
	CONSTRAINT `property_email_template_name_unique` UNIQUE(`name`)
);
