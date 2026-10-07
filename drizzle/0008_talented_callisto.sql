CREATE TABLE `sheet_deposits` (
	`batch` text NOT NULL,
	`row` integer NOT NULL,
	`name_key` text NOT NULL,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`yang` integer NOT NULL,
	`note` text NOT NULL,
	PRIMARY KEY(`batch`, `row`),
	CONSTRAINT "sheet_deposit_amount" CHECK("sheet_deposits"."yang">0)
);
--> statement-breakpoint
CREATE INDEX `sheet_deposit_name_date` ON `sheet_deposits` (`batch`,`name_key`,`date`);--> statement-breakpoint
CREATE TABLE `sheet_people` (
	`batch` text NOT NULL,
	`name_key` text NOT NULL,
	`name` text NOT NULL,
	`yang` integer NOT NULL,
	PRIMARY KEY(`batch`, `name_key`),
	CONSTRAINT "sheet_person_amount" CHECK("sheet_people"."yang">=0)
);
--> statement-breakpoint
CREATE TABLE `sheet_sync` (
	`key` text PRIMARY KEY NOT NULL,
	`batch` text,
	`checked` integer DEFAULT 0 NOT NULL,
	`attempted` integer DEFAULT 0 NOT NULL,
	`lease` integer DEFAULT 0 NOT NULL,
	`error` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weekly_rewards` (
	`member_id` text NOT NULL,
	`week` text NOT NULL,
	`pp` integer NOT NULL,
	`yang` integer NOT NULL,
	`batch` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`member_id`, `week`),
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "weekly_reward_amount" CHECK("weekly_rewards"."pp">=0 AND "weekly_rewards"."yang">0)
);

--> statement-breakpoint
CREATE TRIGGER weekly_reward_credit AFTER INSERT ON weekly_rewards WHEN NEW.pp>0 BEGIN
 INSERT INTO ledger(id,member_id,amount,category,label,created) VALUES('weekly:'||NEW.week||':'||NEW.member_id,NEW.member_id,NEW.pp,'Deposits','Weekly Contribution / Guild Bank',NEW.created);
END;
CREATE TRIGGER weekly_reward_immutable_update BEFORE UPDATE ON weekly_rewards BEGIN SELECT RAISE(ABORT,'Weekly reward history is immutable'); END;
CREATE TRIGGER weekly_reward_immutable_delete BEFORE DELETE ON weekly_rewards BEGIN SELECT RAISE(ABORT,'Weekly reward history is immutable'); END;
