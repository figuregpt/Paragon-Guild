CREATE TABLE `bank_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`batch` text,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`source_row` integer,
	`source_tab` text,
	`loan_id` text,
	`created_by` text,
	FOREIGN KEY (`loan_id`) REFERENCES `guild_loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "valid_bank_entry" CHECK("bank_entries"."amount"<>0 AND "bank_entries"."kind" IN ('deposit','expense','loan','repayment'))
);
--> statement-breakpoint
CREATE TABLE `bank_people` (
	`id` text PRIMARY KEY NOT NULL,
	`batch` text NOT NULL,
	`name` text NOT NULL,
	`class` text NOT NULL,
	`yang` integer NOT NULL,
	`active` integer NOT NULL,
	CONSTRAINT "valid_bank_person" CHECK("bank_people"."yang">=0 AND "bank_people"."active" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `bank_source` (
	`key` text PRIMARY KEY NOT NULL,
	`batch` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`issues` text NOT NULL,
	`imported` integer NOT NULL,
	`imported_by` text NOT NULL,
	FOREIGN KEY (`imported_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `guild_loans` (
	`id` text PRIMARY KEY NOT NULL,
	`batch` text,
	`borrower` text NOT NULL,
	`principal` integer NOT NULL,
	`repaid` integer DEFAULT 0 NOT NULL,
	`description` text NOT NULL,
	`issued` text NOT NULL,
	`due` text,
	`created` integer NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "valid_loan" CHECK("guild_loans"."principal">0 AND "guild_loans"."repaid">=0 AND "guild_loans"."repaid"<="guild_loans"."principal")
);
