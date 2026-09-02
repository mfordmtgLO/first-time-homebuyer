CREATE TABLE `public_site_invite` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`invitedEmail` varchar(320) NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`memberUserId` int,
	`status` enum('pending','accepted','revoked') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `public_site_invite_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_site_invite_token_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `public_site_invite_owner_status_idx` ON `public_site_invite` (`ownerUserId`,`status`);--> statement-breakpoint
CREATE INDEX `public_site_invite_email_created_idx` ON `public_site_invite` (`invitedEmail`,`createdAt`);