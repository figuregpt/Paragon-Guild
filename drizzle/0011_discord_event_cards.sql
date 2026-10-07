CREATE TABLE `discord_announcements` (
	`event_id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`leased` integer,
	`message_id` text,
	`created` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "valid_announcement_status" CHECK("discord_announcements"."status" IN ('pending','sending','sent','skipped','failed') AND "discord_announcements"."attempts" >= 0)
);
