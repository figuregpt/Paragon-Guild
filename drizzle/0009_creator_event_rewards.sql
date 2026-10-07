-- New event approvals reward the creator and each confirmed participant once.
-- Existing completed events and their immutable ledger records stay unchanged.
DROP TRIGGER event_complete;
CREATE TRIGGER event_complete AFTER UPDATE OF status ON events WHEN OLD.status='upcoming' AND NEW.status='completed' BEGIN
 INSERT INTO ledger(id,member_id,amount,category,label,created)
 SELECT 'event:'||NEW.id||':'||member_id,member_id,NEW.pp,CASE WHEN NEW.kind='Help' THEN 'Help' ELSE NEW.type END,NEW.title||' / Participation',unixepoch() FROM event_members WHERE event_id=NEW.id AND member_id<>NEW.created_by AND attended=1 AND (NEW.kind='Legacy' OR joined=1);
 INSERT INTO ledger(id,member_id,amount,category,label,created)
 SELECT 'event:'||NEW.id||':'||NEW.created_by,NEW.created_by,NEW.pp,CASE WHEN NEW.kind='Help' THEN 'Help' ELSE NEW.type END,NEW.title||' / Creator',unixepoch() WHERE NEW.kind<>'Legacy' AND NEW.phase='approved';
END;
--> statement-breakpoint
-- The creator is included automatically, rather than signing up twice.
DROP TRIGGER creator_participation_insert;
CREATE TRIGGER creator_participation_insert BEFORE INSERT ON event_members WHEN NEW.joined=1 AND EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND kind<>'Legacy' AND created_by=NEW.member_id) BEGIN
 SELECT RAISE(ABORT,'The creator is included automatically on approval');
END;
DROP TRIGGER creator_participation_update;
CREATE TRIGGER creator_participation_update BEFORE UPDATE OF joined,attended ON event_members WHEN (NEW.joined=1 OR NEW.attended=1) AND EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND kind<>'Legacy' AND created_by=NEW.member_id) BEGIN
 SELECT RAISE(ABORT,'The creator is included automatically on approval');
END;
