ALTER TABLE `events` ADD `location` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TRIGGER event_location_required BEFORE INSERT ON events WHEN NEW.kind<>'Legacy' AND length(trim(NEW.location))=0 BEGIN
 SELECT RAISE(ABORT,'Choose an event location');
END;
CREATE TRIGGER event_location_immutable BEFORE UPDATE OF location ON events WHEN OLD.kind<>'Legacy' AND NEW.location<>OLD.location BEGIN
 SELECT RAISE(ABORT,'Event location cannot change');
END;
