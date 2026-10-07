CREATE TABLE `event_reward_reviews` (
	`event_id` text NOT NULL,
	`member_id` text NOT NULL,
	`decision` text NOT NULL,
	`reviewed_by` text NOT NULL,
	`reviewed` integer NOT NULL,
	PRIMARY KEY(`event_id`, `member_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "valid_reward_decision" CHECK("event_reward_reviews"."decision" IN ('approved','rejected'))
);
--> statement-breakpoint
CREATE TRIGGER reward_review_insert BEFORE INSERT ON event_reward_reviews BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM members WHERE id=NEW.reviewed_by AND admin=1 AND active=1) THEN RAISE(ABORT,'A guild administrator must review this event') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM events e WHERE e.id=NEW.event_id AND e.kind<>'Legacy' AND e.phase='pending' AND (e.created_by=NEW.member_id OR EXISTS(SELECT 1 FROM event_members em WHERE em.event_id=e.id AND em.member_id=NEW.member_id AND em.joined=1 AND em.attended=1))) THEN RAISE(ABORT,'Choose only eligible event members') END;
END;
CREATE TRIGGER reward_review_update BEFORE UPDATE ON event_reward_reviews BEGIN SELECT RAISE(ABORT,'Reward reviews are immutable'); END;
CREATE TRIGGER reward_review_delete BEFORE DELETE ON event_reward_reviews BEGIN SELECT RAISE(ABORT,'Reward reviews are immutable'); END;
CREATE TRIGGER reward_review_finalize BEFORE UPDATE OF phase ON events WHEN OLD.phase='pending' AND NEW.phase IN ('approved','rejected') BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM event_reward_reviews WHERE event_id=NEW.id)<>1+(SELECT COUNT(*) FROM event_members WHERE event_id=NEW.id AND member_id<>NEW.created_by AND joined=1 AND attended=1) THEN RAISE(ABORT,'Review each eligible event member') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM event_reward_reviews WHERE event_id=NEW.id AND reviewed_by<>NEW.reviewed_by) THEN RAISE(ABORT,'Review author must match') END;
 SELECT CASE WHEN NEW.phase='approved' AND NOT EXISTS(SELECT 1 FROM event_reward_reviews WHERE event_id=NEW.id AND decision='approved') THEN RAISE(ABORT,'Select at least one member to award PP') END;
 SELECT CASE WHEN NEW.phase='rejected' AND EXISTS(SELECT 1 FROM event_reward_reviews WHERE event_id=NEW.id AND decision='approved') THEN RAISE(ABORT,'Rejected events cannot award PP') END;
END;
DROP TRIGGER event_complete;
CREATE TRIGGER event_complete AFTER UPDATE OF status ON events WHEN OLD.status='upcoming' AND NEW.status='completed' BEGIN
 INSERT INTO ledger(id,member_id,amount,category,label,created)
 SELECT 'event:'||NEW.id||':'||member_id,member_id,NEW.pp,NEW.type,NEW.title||' / Participation',unixepoch() FROM event_members WHERE event_id=NEW.id AND member_id<>NEW.created_by AND attended=1 AND NEW.kind='Legacy';
 INSERT INTO ledger(id,member_id,amount,category,label,created)
 SELECT 'event:'||NEW.id||':'||member_id,member_id,NEW.pp,CASE WHEN NEW.kind='Help' THEN 'Help' ELSE NEW.type END,NEW.title||CASE WHEN member_id=NEW.created_by THEN ' / Creator' ELSE ' / Participation' END,unixepoch() FROM event_reward_reviews WHERE event_id=NEW.id AND decision='approved' AND NEW.kind<>'Legacy' AND NEW.phase='approved';
END;
