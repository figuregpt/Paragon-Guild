CREATE TABLE member_profiles (
 member_id TEXT PRIMARY KEY NOT NULL REFERENCES members(id),
 bonuses TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(bonuses) AND json_type(bonuses)='object'),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1),
 updated INTEGER NOT NULL
);
CREATE TABLE pvp_groups (
 id TEXT PRIMARY KEY NOT NULL,
 name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(name)) BETWEEN 1 AND 60),
 description TEXT NOT NULL DEFAULT '' CHECK(length(description)<=200),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1),
 updated INTEGER NOT NULL,
 updated_by TEXT NOT NULL REFERENCES members(id)
);
CREATE TABLE pvp_group_members (
 member_id TEXT PRIMARY KEY NOT NULL REFERENCES members(id),
 group_id TEXT NOT NULL REFERENCES pvp_groups(id) ON DELETE CASCADE
);
CREATE INDEX pvp_group_member_group ON pvp_group_members(group_id);
-- Transactional compare-and-swap checks abort the entire batch on concurrent edits.
CREATE TABLE profile_write_guards (expected INTEGER NOT NULL,actual INTEGER NOT NULL,CONSTRAINT profile_write_guards CHECK(expected=actual));
ALTER TABLE events ADD cancelled_by TEXT REFERENCES members(id);
ALTER TABLE events ADD cancelled_at INTEGER;
ALTER TABLE events ADD cancel_note TEXT NOT NULL DEFAULT '';
DROP TRIGGER member_event_update;
CREATE TRIGGER member_event_update BEFORE UPDATE ON events WHEN OLD.kind<>'Legacy' BEGIN
 SELECT CASE WHEN NEW.kind<>OLD.kind OR NEW.pp<>OLD.pp OR NEW.type<>OLD.type OR NEW.created_by<>OLD.created_by OR NEW.starts<>OLD.starts OR NEW.title<>OLD.title OR NEW.creation_day<>OLD.creation_day THEN RAISE(ABORT,'Event identity and rewards cannot change') END;
 SELECT CASE WHEN NEW.phase<>OLD.phase AND NOT ((OLD.phase='open' AND NEW.phase IN ('confirming','cancelled')) OR (OLD.phase='confirming' AND NEW.phase IN ('pending','cancelled')) OR (OLD.phase='pending' AND (NEW.phase IN ('approved','rejected') OR (NEW.phase='cancelled' AND NEW.cancelled_by IS NOT NULL AND EXISTS(SELECT 1 FROM members WHERE id=NEW.cancelled_by AND admin=1 AND active=1))))) THEN RAISE(ABORT,'This event has already been finalized') END;
 SELECT CASE WHEN NEW.phase='confirming' AND NEW.starts>unixepoch() THEN RAISE(ABORT,'This event has not started') END;
 SELECT CASE WHEN NEW.phase='pending' AND NOT EXISTS(SELECT 1 FROM event_evidence WHERE event_id=NEW.id) THEN RAISE(ABORT,'A screenshot is required before review') END;
 SELECT CASE WHEN NEW.phase IN ('approved','rejected') AND (NEW.reviewed_by IS NULL OR NOT EXISTS(SELECT 1 FROM members WHERE id=NEW.reviewed_by AND admin=1)) THEN RAISE(ABORT,'A guild administrator must review this event') END;
 SELECT CASE WHEN NEW.status='completed' AND NEW.phase<>'approved' THEN RAISE(ABORT,'Administrator approval is required before PP is awarded') END;
 SELECT CASE WHEN NEW.phase='approved' AND NEW.status<>'completed' THEN RAISE(ABORT,'An approved event must be completed') END;
END;
CREATE TRIGGER event_admin_cancel BEFORE UPDATE OF cancelled_by ON events WHEN NEW.cancelled_by IS NOT NULL BEGIN
 SELECT CASE WHEN OLD.status<>'upcoming' OR OLD.phase NOT IN ('legacy','open','confirming','pending') OR NEW.phase<>'cancelled' OR NEW.status<>'cancelled' OR NEW.cancelled_at IS NULL OR NOT EXISTS(SELECT 1 FROM members WHERE id=NEW.cancelled_by AND admin=1 AND active=1) THEN RAISE(ABORT,'Only an administrator can cancel an unfinished event') END;
END;
