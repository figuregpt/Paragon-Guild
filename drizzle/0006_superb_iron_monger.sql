ALTER TABLE `events` ADD `duration_minutes` integer;
--> statement-breakpoint
CREATE TRIGGER help_duration_validate BEFORE INSERT ON events WHEN NEW.kind='Help' BEGIN
 SELECT CASE WHEN NEW.duration_minutes IS NULL OR NEW.duration_minutes NOT BETWEEN 1 AND 1440 THEN RAISE(ABORT,'Choose a Help duration between 1 and 1440 minutes') END;
END;
CREATE TRIGGER event_duration_immutable BEFORE UPDATE OF duration_minutes ON events WHEN NEW.duration_minutes IS NOT OLD.duration_minutes BEGIN
 SELECT RAISE(ABORT,'Event duration cannot change');
END;
CREATE TRIGGER help_end_evidence BEFORE UPDATE OF phase ON events WHEN NEW.kind='Help' AND OLD.phase='open' AND NEW.phase='confirming' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM event_evidence WHERE event_id=NEW.id) THEN RAISE(ABORT,'Upload a screenshot before ending this Help event') END;
END;
DROP TRIGGER evidence_insert_validate;
CREATE TRIGGER evidence_insert_validate BEFORE INSERT ON event_evidence BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND kind<>'Legacy' AND created_by=NEW.uploaded_by AND phase IN ('open','confirming') AND starts<=unixepoch()) THEN RAISE(ABORT,'Evidence can only be uploaded by the creator during the event or attendance confirmation') END;
END;
CREATE TRIGGER creator_participation_insert BEFORE INSERT ON event_members WHEN NEW.joined=1 AND EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND kind<>'Legacy' AND created_by=NEW.member_id) BEGIN
 SELECT RAISE(ABORT,'The event creator cannot receive participation rewards');
END;
CREATE TRIGGER creator_participation_update BEFORE UPDATE OF joined,attended ON event_members WHEN (NEW.joined=1 OR NEW.attended=1) AND EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND kind<>'Legacy' AND created_by=NEW.member_id) BEGIN
 SELECT RAISE(ABORT,'The event creator cannot receive participation rewards');
END;
DROP TRIGGER event_complete;
CREATE TRIGGER event_complete AFTER UPDATE OF status ON events WHEN OLD.status='upcoming' AND NEW.status='completed' BEGIN
 INSERT INTO ledger(id,member_id,amount,category,label,created)
 SELECT 'event:'||NEW.id||':'||member_id,member_id,NEW.pp,CASE WHEN NEW.kind='Help' THEN 'Help' ELSE NEW.type END,NEW.title||' / Participation',unixepoch() FROM event_members WHERE event_id=NEW.id AND member_id<>NEW.created_by AND attended=1 AND (NEW.kind='Legacy' OR joined=1);
END;
