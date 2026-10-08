-- Apply the new creation policy without changing existing events or PP history.
DROP TRIGGER member_event_create;
CREATE TRIGGER member_event_create BEFORE INSERT ON events WHEN NEW.kind<>'Legacy' BEGIN
 SELECT CASE WHEN NEW.phase<>'open' OR NEW.creation_day IS NULL OR NOT (
  (NEW.kind='Help' AND NEW.type='PvE' AND NEW.pp=10) OR
  (NEW.kind='Demon Tower' AND NEW.type='PvE' AND NEW.pp=10 AND NEW.location='Demon Tower') OR
  (NEW.kind='PvE' AND NEW.type='PvE' AND NEW.pp=35) OR
  (NEW.kind IN ('PvP','Guild War') AND NEW.type='PvP' AND NEW.pp=100) OR
  (NEW.kind='World Boss' AND NEW.type='PvE' AND NEW.pp=75) OR
  (NEW.kind='Custom' AND NEW.type='PvE' AND typeof(NEW.pp)='integer' AND NEW.pp BETWEEN 1 AND 1000000)
 ) THEN RAISE(ABORT,'Invalid event type or reward') END;
 SELECT CASE WHEN NEW.kind<>'Help' AND NEW.duration_minutes IS NOT NULL THEN RAISE(ABORT,'This event ends manually') END;
 SELECT CASE WHEN NEW.kind='Help' AND (SELECT COUNT(*) FROM events WHERE created_by=NEW.created_by AND kind='Help' AND creation_day=NEW.creation_day)>=2 THEN RAISE(ABORT,'You can create 2 Help events per guild day') END;
 SELECT CASE WHEN NEW.kind<>'Help' AND NOT EXISTS(SELECT 1 FROM members WHERE id=NEW.created_by AND can_host=1 AND active=1) THEN RAISE(ABORT,'The Experienced Discord role is required') END;
END;
--> statement-breakpoint
DROP TRIGGER event_complete;
CREATE TRIGGER event_complete AFTER UPDATE OF status ON events WHEN OLD.status='upcoming' AND NEW.status='completed' BEGIN
 INSERT INTO ledger(id,member_id,amount,category,label,created)
 SELECT 'event:'||NEW.id||':'||member_id,member_id,NEW.pp,NEW.type,NEW.title||' / Participation',unixepoch() FROM event_members WHERE event_id=NEW.id AND member_id<>NEW.created_by AND attended=1 AND NEW.kind='Legacy';
 INSERT INTO ledger(id,member_id,amount,category,label,created)
 SELECT 'event:'||NEW.id||':'||member_id,member_id,NEW.pp,CASE WHEN NEW.kind IN ('Help','Custom') THEN NEW.kind ELSE NEW.type END,NEW.title||CASE WHEN member_id=NEW.created_by THEN ' / Creator' ELSE ' / Participation' END,unixepoch() FROM event_reward_reviews WHERE event_id=NEW.id AND decision='approved' AND NEW.kind<>'Legacy' AND NEW.phase='approved';
END;
