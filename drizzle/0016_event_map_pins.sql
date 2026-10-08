ALTER TABLE `events` ADD `map_asset` text;--> statement-breakpoint
ALTER TABLE `events` ADD `map_x` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `map_y` integer;
--> statement-breakpoint
-- Additive only: preserve existing events, reward/notification triggers and PP history.
CREATE TRIGGER event_map_pin_insert BEFORE INSERT ON events BEGIN
 SELECT CASE WHEN NOT (
  (NEW.map_asset IS NULL AND NEW.map_x IS NULL AND NEW.map_y IS NULL) OR
  (NEW.map_asset IS NOT NULL AND length(NEW.map_asset) BETWEEN 1 AND 80 AND
   typeof(NEW.map_x)='integer' AND NEW.map_x BETWEEN 0 AND 10000 AND
   typeof(NEW.map_y)='integer' AND NEW.map_y BETWEEN 0 AND 10000)
 ) THEN RAISE(ABORT,'Invalid event map marker') END;
END;
--> statement-breakpoint
CREATE TRIGGER event_map_pin_update BEFORE UPDATE OF map_asset,map_x,map_y ON events BEGIN
 SELECT CASE WHEN NOT (
  (NEW.map_asset IS NULL AND NEW.map_x IS NULL AND NEW.map_y IS NULL) OR
  (NEW.map_asset IS NOT NULL AND length(NEW.map_asset) BETWEEN 1 AND 80 AND
   typeof(NEW.map_x)='integer' AND NEW.map_x BETWEEN 0 AND 10000 AND
   typeof(NEW.map_y)='integer' AND NEW.map_y BETWEEN 0 AND 10000)
 ) THEN RAISE(ABORT,'Invalid event map marker') END;
END;
