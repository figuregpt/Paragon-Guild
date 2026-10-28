PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_boss_timers` (
	`member_id` text NOT NULL,
	`boss_id` text NOT NULL,
	`game_channel` integer NOT NULL,
	`killed` integer NOT NULL,
	`respawns` integer NOT NULL,
	`revision` text NOT NULL,
	PRIMARY KEY(`member_id`, `boss_id`, `game_channel`),
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "boss_timer_valid" CHECK("__new_boss_timers"."game_channel" BETWEEN 1 AND 6 AND "__new_boss_timers"."respawns">="__new_boss_timers"."killed" AND "__new_boss_timers"."respawns"<="__new_boss_timers"."killed"+86400)
);
--> statement-breakpoint
INSERT INTO `__new_boss_timers`("member_id", "boss_id", "game_channel", "killed", "respawns", "revision") SELECT "member_id", "boss_id", "game_channel", "killed", "respawns", "revision" FROM `boss_timers`;--> statement-breakpoint
DROP TABLE `boss_timers`;--> statement-breakpoint
ALTER TABLE `__new_boss_timers` RENAME TO `boss_timers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `boss_timer_revision` ON `boss_timers` (`revision`);--> statement-breakpoint
CREATE INDEX `boss_timer_due` ON `boss_timers` (`respawns`);