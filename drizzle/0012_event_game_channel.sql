ALTER TABLE `events` ADD `game_channel` integer;--> statement-breakpoint
CREATE TRIGGER event_channel_insert BEFORE INSERT ON events WHEN NEW.game_channel IS NOT NULL AND (typeof(NEW.game_channel)<>'integer' OR NEW.game_channel NOT BETWEEN 1 AND 6) BEGIN
 SELECT RAISE(ABORT,'Choose a channel between CH-1 and CH-6');
END;
CREATE TRIGGER event_channel_update BEFORE UPDATE OF game_channel ON events WHEN NEW.game_channel IS NOT OLD.game_channel BEGIN
 SELECT RAISE(ABORT,'An event channel cannot change after creation');
END;
