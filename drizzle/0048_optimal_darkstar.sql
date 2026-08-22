CREATE TABLE `email_template_ai_prompt` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`prompt` varchar(800) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_template_ai_prompt_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_template_ai_prompt_owner_name_unique` UNIQUE(`ownerUserId`,`name`)
);
--> statement-breakpoint
CREATE INDEX `email_template_ai_prompt_owner_name_idx` ON `email_template_ai_prompt` (`ownerUserId`,`name`);