CREATE TABLE `auctions` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`upgrade` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`source` text NOT NULL,
	`bonuses` text NOT NULL,
	`minimum` integer NOT NULL,
	`increment` integer NOT NULL,
	`current` integer DEFAULT 0 NOT NULL,
	`winner` text,
	`starts` integer NOT NULL,
	`ends` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "valid_auction" CHECK("auctions"."minimum" > 0 AND "auctions"."increment" > 0 AND "auctions"."ends" > "auctions"."starts" AND "auctions"."current" >= 0 AND "auctions"."upgrade" BETWEEN 0 AND 9 AND "auctions"."quantity" > 0 AND "auctions"."status" IN ('active','closed','cancelled'))
);
--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bids` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_id` text NOT NULL,
	`member_id` text NOT NULL,
	`amount` integer NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`auction_id`) REFERENCES `auctions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `deposits` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`yang` integer NOT NULL,
	`pp` integer NOT NULL,
	`kind` text NOT NULL,
	`week` text,
	`note` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`created` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "valid_deposit" CHECK("deposits"."yang" > 0 AND "deposits"."pp" >= 0 AND "deposits"."status" IN ('pending','approved','rejected') AND "deposits"."kind" IN ('weekly','donation'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_weekly_deposit` ON `deposits` (`member_id`,`week`);--> statement-breakpoint
CREATE TABLE `event_members` (
	`event_id` text NOT NULL,
	`member_id` text NOT NULL,
	`joined` integer DEFAULT 0 NOT NULL,
	`attended` integer DEFAULT 0 NOT NULL,
	`reminder` integer,
	`created` integer NOT NULL,
	PRIMARY KEY(`event_id`, `member_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`starts` integer NOT NULL,
	`pp` integer NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`created_by` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "valid_event" CHECK("events"."pp" >= 0 AND "events"."type" IN ('PvE','PvP') AND "events"."status" IN ('upcoming','completed','cancelled'))
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`height` integer NOT NULL,
	`level` integer,
	`classes` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL,
	`label` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`class` text NOT NULL,
	`avatar` text,
	`admin` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL,
	`new_events` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL,
	CONSTRAINT "valid_balance" CHECK("members"."balance" >= "members"."reserved" AND "members"."reserved" >= 0)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`event_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`expires` integer NOT NULL,
	`verified` integer NOT NULL,
	`oauth` text,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE TRIGGER ledger_apply AFTER INSERT ON ledger BEGIN
 UPDATE members SET balance=balance+NEW.amount WHERE id=NEW.member_id;
END;
--> statement-breakpoint
CREATE TRIGGER ledger_no_update BEFORE UPDATE ON ledger BEGIN SELECT RAISE(ABORT,'PP records are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER ledger_no_delete BEFORE DELETE ON ledger BEGIN SELECT RAISE(ABORT,'PP records are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER bid_validate BEFORE INSERT ON bids BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM auctions WHERE id=NEW.auction_id AND status='active' AND starts<=unixepoch() AND ends>unixepoch()) THEN RAISE(ABORT,'This auction has ended') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM members WHERE id=NEW.member_id AND active=1) THEN RAISE(ABORT,'Guild membership is required') END;
 SELECT CASE WHEN NEW.amount < (SELECT CASE WHEN current=0 THEN minimum ELSE current+increment END FROM auctions WHERE id=NEW.auction_id) OR (NEW.amount-(SELECT minimum FROM auctions WHERE id=NEW.auction_id)) % (SELECT increment FROM auctions WHERE id=NEW.auction_id) != 0 THEN RAISE(ABORT,'Bid is below the minimum or uses an invalid increment') END;
 SELECT CASE WHEN NEW.amount > (SELECT balance-reserved+COALESCE((SELECT current FROM auctions WHERE id=NEW.auction_id AND winner=NEW.member_id),0) FROM members WHERE id=NEW.member_id) THEN RAISE(ABORT,'Not enough available PP') END;
END;
--> statement-breakpoint
CREATE TRIGGER bid_apply AFTER INSERT ON bids BEGIN
 UPDATE members SET reserved=reserved-(SELECT current FROM auctions WHERE id=NEW.auction_id) WHERE id=(SELECT winner FROM auctions WHERE id=NEW.auction_id);
 UPDATE members SET reserved=reserved+NEW.amount WHERE id=NEW.member_id;
 UPDATE auctions SET current=NEW.amount,winner=NEW.member_id WHERE id=NEW.auction_id;
END;
--> statement-breakpoint
CREATE TRIGGER bid_no_update BEFORE UPDATE ON bids BEGIN SELECT RAISE(ABORT,'Bids are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER bid_no_delete BEFORE DELETE ON bids BEGIN SELECT RAISE(ABORT,'Bids are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER auction_close_validate BEFORE UPDATE OF status ON auctions WHEN NEW.status<>OLD.status BEGIN
 SELECT CASE WHEN OLD.status<>'active' OR NEW.status NOT IN ('closed','cancelled') THEN RAISE(ABORT,'This auction has already been settled') END;
 SELECT CASE WHEN NEW.status='closed' AND OLD.ends>unixepoch() THEN RAISE(ABORT,'This auction is still open') END;
END;
--> statement-breakpoint
CREATE TRIGGER auction_release AFTER UPDATE OF status ON auctions WHEN OLD.status='active' AND NEW.status IN ('closed','cancelled') BEGIN
 UPDATE members SET reserved=reserved-OLD.current WHERE id=OLD.winner;
 INSERT INTO ledger(id,member_id,amount,category,label,created)
 SELECT 'auction:'||NEW.id,OLD.winner,-OLD.current,'Loot',(SELECT name FROM items WHERE id=NEW.item_id)||' auction won',unixepoch() WHERE OLD.winner IS NOT NULL AND NEW.status='closed';
END;
--> statement-breakpoint
CREATE TRIGGER deposit_validate BEFORE UPDATE ON deposits BEGIN
 SELECT CASE WHEN OLD.status<>'pending' OR NEW.status NOT IN ('approved','rejected') OR NEW.reviewed_by IS NULL OR NEW.yang<>OLD.yang OR NEW.pp<>OLD.pp OR NEW.member_id<>OLD.member_id THEN RAISE(ABORT,'This deposit has already been reviewed') END;
END;
--> statement-breakpoint
CREATE TRIGGER deposit_approve AFTER UPDATE OF status ON deposits WHEN OLD.status='pending' AND NEW.status='approved' BEGIN
 INSERT INTO ledger(id,member_id,amount,category,label,created) VALUES('deposit:'||NEW.id,NEW.member_id,NEW.pp,'Deposits',CASE WHEN NEW.kind='weekly' THEN 'Weekly Deposit' ELSE 'Guild Donation' END||' / '||NEW.yang||' Yang',unixepoch());
END;
--> statement-breakpoint
CREATE TRIGGER event_finish_validate BEFORE UPDATE OF status ON events WHEN NEW.status<>OLD.status BEGIN
 SELECT CASE WHEN OLD.status<>'upcoming' OR NEW.status NOT IN ('completed','cancelled') THEN RAISE(ABORT,'This event has already been finalized') END;
 SELECT CASE WHEN NEW.status='completed' AND OLD.starts>unixepoch() THEN RAISE(ABORT,'This event has not started') END;
END;
--> statement-breakpoint
CREATE TRIGGER event_complete AFTER UPDATE OF status ON events WHEN OLD.status='upcoming' AND NEW.status='completed' BEGIN
 INSERT INTO ledger(id,member_id,amount,category,label,created)
 SELECT 'event:'||NEW.id||':'||member_id,member_id,NEW.pp,NEW.type,NEW.title||' / Participation',unixepoch() FROM event_members WHERE event_id=NEW.id AND attended=1;
END;
--> statement-breakpoint
CREATE TRIGGER attendance_validate BEFORE UPDATE OF attended ON event_members BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND status='upcoming') THEN RAISE(ABORT,'Attendance for a finalized event cannot change') END;
END;
