CREATE TABLE `event_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `evidence_event` ON `event_evidence` (`event_id`);--> statement-breakpoint
ALTER TABLE `events` ADD `kind` text DEFAULT 'Legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `phase` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `creation_day` text;--> statement-breakpoint
ALTER TABLE `events` ADD `ended` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `submitted` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `reviewed` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `reviewed_by` text REFERENCES members(id);--> statement-breakpoint
ALTER TABLE `events` ADD `review_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `event_owner_phase` ON `events` (`created_by`,`phase`);--> statement-breakpoint
CREATE INDEX `event_owner_day` ON `events` (`created_by`,`creation_day`,`kind`);--> statement-breakpoint
ALTER TABLE `members` ADD `can_host` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TRIGGER member_event_create BEFORE INSERT ON events WHEN NEW.kind<>'Legacy' BEGIN
 SELECT CASE WHEN NEW.phase<>'open' OR NEW.creation_day IS NULL OR NOT ((NEW.kind='Help' AND NEW.type='PvE' AND NEW.pp=25) OR (NEW.kind='PvE' AND NEW.type='PvE' AND NEW.pp=35) OR (NEW.kind='PvP' AND NEW.type='PvP' AND NEW.pp=75) OR (NEW.kind='World Boss' AND NEW.type='PvE' AND NEW.pp=100)) THEN RAISE(ABORT,'Invalid event type or reward') END;
 SELECT CASE WHEN NEW.kind='Help' AND (SELECT COUNT(*) FROM events WHERE created_by=NEW.created_by AND kind='Help' AND creation_day=NEW.creation_day)>=2 THEN RAISE(ABORT,'You can create 2 Help events per guild day') END;
 SELECT CASE WHEN NEW.kind<>'Help' AND NOT EXISTS(SELECT 1 FROM members WHERE id=NEW.created_by AND can_host=1) THEN RAISE(ABORT,'An event organizer Discord role is required') END;
END;
CREATE TRIGGER member_event_update BEFORE UPDATE ON events WHEN OLD.kind<>'Legacy' BEGIN
 SELECT CASE WHEN NEW.kind<>OLD.kind OR NEW.pp<>OLD.pp OR NEW.type<>OLD.type OR NEW.created_by<>OLD.created_by OR NEW.starts<>OLD.starts OR NEW.title<>OLD.title OR NEW.creation_day<>OLD.creation_day THEN RAISE(ABORT,'Event identity and rewards cannot change') END;
 SELECT CASE WHEN NEW.phase<>OLD.phase AND NOT ((OLD.phase='open' AND NEW.phase IN ('confirming','cancelled')) OR (OLD.phase='confirming' AND NEW.phase IN ('pending','cancelled')) OR (OLD.phase='pending' AND NEW.phase IN ('approved','rejected'))) THEN RAISE(ABORT,'This event has already been finalized') END;
 SELECT CASE WHEN NEW.phase='confirming' AND NEW.starts>unixepoch() THEN RAISE(ABORT,'This event has not started') END;
 SELECT CASE WHEN NEW.phase='pending' AND NOT EXISTS(SELECT 1 FROM event_evidence WHERE event_id=NEW.id) THEN RAISE(ABORT,'A screenshot is required before review') END;
 SELECT CASE WHEN NEW.phase IN ('approved','rejected') AND (NEW.reviewed_by IS NULL OR NOT EXISTS(SELECT 1 FROM members WHERE id=NEW.reviewed_by AND admin=1)) THEN RAISE(ABORT,'A guild administrator must review this event') END;
 SELECT CASE WHEN NEW.status='completed' AND NEW.phase<>'approved' THEN RAISE(ABORT,'Administrator approval is required before PP is awarded') END;
 SELECT CASE WHEN NEW.phase='approved' AND NEW.status<>'completed' THEN RAISE(ABORT,'An approved event must be completed') END;
END;
DROP TRIGGER attendance_validate;
CREATE TRIGGER attendance_validate BEFORE UPDATE OF attended ON event_members BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND status='upcoming' AND phase IN ('legacy','open','confirming')) THEN RAISE(ABORT,'Attendance for a finalized event cannot change') END;
END;
CREATE TRIGGER evidence_insert_validate BEFORE INSERT ON event_evidence BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND created_by=NEW.uploaded_by AND phase='confirming') THEN RAISE(ABORT,'Evidence can only be uploaded by the event creator before submission') END;
END;
DROP TRIGGER event_complete;
CREATE TRIGGER event_complete AFTER UPDATE OF status ON events WHEN OLD.status='upcoming' AND NEW.status='completed' BEGIN
 INSERT INTO ledger(id,member_id,amount,category,label,created)
 SELECT 'event:'||NEW.id||':'||member_id,member_id,NEW.pp,CASE WHEN NEW.kind='Help' THEN 'Help' ELSE NEW.type END,NEW.title||' / Participation',unixepoch() FROM event_members WHERE event_id=NEW.id AND attended=1 AND (NEW.kind='Legacy' OR joined=1);
END;

CREATE TRIGGER member_event_signup_insert BEFORE INSERT ON event_members WHEN (SELECT kind FROM events WHERE id=NEW.event_id)<>'Legacy' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND phase='open') THEN RAISE(ABORT,'This event is no longer open') END;
END;
CREATE TRIGGER member_event_signup_update BEFORE UPDATE OF joined ON event_members WHEN (SELECT kind FROM events WHERE id=NEW.event_id)<>'Legacy' AND NEW.joined<>OLD.joined BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND phase='open') THEN RAISE(ABORT,'This event is no longer open') END;
END;
CREATE TRIGGER evidence_count_validate BEFORE INSERT ON event_evidence BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM event_evidence WHERE event_id=NEW.event_id)>=3 THEN RAISE(ABORT,'A maximum of 3 screenshots can be uploaded per event') END;
END;

CREATE TRIGGER evidence_immutable_update BEFORE UPDATE ON event_evidence BEGIN SELECT RAISE(ABORT,'Screenshot evidence is immutable'); END;
CREATE TRIGGER evidence_immutable_delete BEFORE DELETE ON event_evidence BEGIN SELECT RAISE(ABORT,'Screenshot evidence is immutable'); END;
