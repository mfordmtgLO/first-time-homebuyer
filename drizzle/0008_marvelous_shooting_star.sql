ALTER TABLE `chat_intake_lead` ADD `recipientEmailStatus` enum('not_attempted','sent','manual_follow_up') DEFAULT 'not_attempted' NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_intake_lead`
  ADD `recipientEmailStatus` enum('not_attempted','sent','manual_follow_up') NOT NULL DEFAULT 'not_attempted',
  ADD `recipientEmailDetail` text;
