CREATE TABLE `boss_timer_deliveries` (
	`revision` text NOT NULL,
	`endpoint` text NOT NULL,
	`member_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`leased` integer,
	`lease_token` text,
	`next_attempt` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`revision`, `endpoint`),
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "boss_delivery_valid" CHECK("boss_timer_deliveries"."status" IN ('pending','sending','sent','skipped','failed') AND "boss_timer_deliveries"."attempts" BETWEEN 0 AND 4)
);
--> statement-breakpoint
CREATE INDEX `boss_delivery_queue` ON `boss_timer_deliveries` (`status`,`next_attempt`);--> statement-breakpoint
CREATE TABLE `boss_timers` (
	`member_id` text NOT NULL,
	`boss_id` text NOT NULL,
	`game_channel` integer NOT NULL,
	`killed` integer NOT NULL,
	`respawns` integer NOT NULL,
	`revision` text NOT NULL,
	PRIMARY KEY(`member_id`, `boss_id`, `game_channel`),
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "boss_timer_valid" CHECK("boss_timers"."game_channel" BETWEEN 1 AND 6 AND "boss_timers"."respawns"="boss_timers"."killed"+2400)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `boss_timer_revision` ON `boss_timers` (`revision`);--> statement-breakpoint
CREATE INDEX `boss_timer_due` ON `boss_timers` (`respawns`);