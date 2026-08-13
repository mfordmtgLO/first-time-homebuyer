ALTER TABLE `agent_profile` ADD `slug` varchar(160) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_profile` ADD `featured` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_profile` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `agentId` int;--> statement-breakpoint
ALTER TABLE `leads` ADD `sentToAgentAt` timestamp;