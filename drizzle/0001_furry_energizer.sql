DROP INDEX `one_weekly_deposit`;--> statement-breakpoint
CREATE UNIQUE INDEX `one_weekly_deposit` ON `deposits` (`member_id`,`week`) WHERE "deposits"."status" IN ('pending','approved');--> statement-breakpoint
ALTER TABLE `notifications` ADD `leased` integer;