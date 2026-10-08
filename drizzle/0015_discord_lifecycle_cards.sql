CREATE TABLE `discord_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`purpose` text DEFAULT 'card' NOT NULL,
	`part` integer DEFAULT 0 NOT NULL,
	`channel_id` text,
	`message_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`sent_revision` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`leased` integer,
	`next_attempt` integer DEFAULT 0 NOT NULL,
	`next_refresh` integer,
	`created` integer NOT NULL,
	CONSTRAINT "valid_discord_card" CHECK("discord_cards"."entity_type" IN ('event','auction') AND "discord_cards"."purpose" IN ('card','result') AND "discord_cards"."status" IN ('pending','sending','sent','failed','skipped') AND "discord_cards"."revision">0 AND "discord_cards"."sent_revision">=0 AND "discord_cards"."attempts">=0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discord_card_entity_purpose` ON `discord_cards` (`entity_type`,`entity_id`,`purpose`,`part`);--> statement-breakpoint
CREATE INDEX `discord_card_queue` ON `discord_cards` (`status`,`next_attempt`);-- Preserve already posted cards without replaying old results or mentioning the role again.
INSERT INTO discord_cards(id,entity_type,entity_id,purpose,channel_id,message_id,created)
 SELECT 'event:'||d.event_id||':card','event',d.event_id,'card',CASE WHEN d.message_id IS NOT NULL THEN d.channel_id ELSE NULL END,d.message_id,d.created
 FROM discord_announcements d JOIN events e ON e.id=d.event_id
 WHERE d.message_id IS NOT NULL OR (e.phase='open' AND d.status IN ('pending','sending','failed'));
UPDATE discord_announcements SET status='skipped' WHERE status IN ('pending','sending','failed');

CREATE TRIGGER discord_event_create AFTER INSERT ON events WHEN NEW.kind<>'Legacy' BEGIN
 INSERT INTO discord_cards(id,entity_type,entity_id,created) VALUES('event:'||NEW.id||':card','event',NEW.id,NEW.created);
END;
CREATE TRIGGER discord_event_change AFTER UPDATE OF phase,title,starts,ended,submitted,reviewed,review_note,description,location,game_channel ON events WHEN NEW.kind<>'Legacy' BEGIN
 UPDATE discord_cards SET revision=revision+1,status=CASE WHEN status='sending' THEN status ELSE 'pending' END,attempts=CASE WHEN status='sending' THEN attempts ELSE 0 END,next_attempt=0 WHERE entity_type='event' AND entity_id=NEW.id AND purpose='card';
 INSERT OR IGNORE INTO discord_cards(id,entity_type,entity_id,purpose,created)
 SELECT 'event:'||NEW.id||':result','event',NEW.id,'result',unixepoch() WHERE OLD.phase<>NEW.phase AND NEW.phase IN ('approved','rejected','cancelled');
END;
CREATE TRIGGER discord_event_join AFTER INSERT ON event_members BEGIN
 UPDATE discord_cards SET revision=revision+1,status=CASE WHEN status='sending' THEN status ELSE 'pending' END,attempts=CASE WHEN status='sending' THEN attempts ELSE 0 END,next_attempt=0 WHERE entity_type='event' AND entity_id=NEW.event_id AND purpose='card';
END;
CREATE TRIGGER discord_event_attendance AFTER UPDATE OF joined,attended ON event_members WHEN OLD.joined<>NEW.joined OR OLD.attended<>NEW.attended BEGIN
 UPDATE discord_cards SET revision=revision+1,status=CASE WHEN status='sending' THEN status ELSE 'pending' END,attempts=CASE WHEN status='sending' THEN attempts ELSE 0 END,next_attempt=0 WHERE entity_type='event' AND entity_id=NEW.event_id AND purpose='card';
END;
CREATE TRIGGER discord_event_leave AFTER DELETE ON event_members BEGIN
 UPDATE discord_cards SET revision=revision+1,status=CASE WHEN status='sending' THEN status ELSE 'pending' END,attempts=CASE WHEN status='sending' THEN attempts ELSE 0 END,next_attempt=0 WHERE entity_type='event' AND entity_id=OLD.event_id AND purpose='card';
END;
CREATE TRIGGER discord_auction_create AFTER INSERT ON auctions BEGIN
 INSERT INTO discord_cards(id,entity_type,entity_id,created) VALUES('auction:'||NEW.id||':card','auction',NEW.id,NEW.created);
END;
CREATE TRIGGER discord_auction_change AFTER UPDATE OF current,winner,status,ends ON auctions WHEN OLD.current<>NEW.current OR OLD.winner IS NOT NEW.winner OR OLD.status<>NEW.status OR OLD.ends<>NEW.ends BEGIN
 UPDATE discord_cards SET revision=revision+1,status=CASE WHEN status='sending' THEN status ELSE 'pending' END,attempts=CASE WHEN status='sending' THEN attempts ELSE 0 END,next_attempt=0 WHERE entity_type='auction' AND entity_id=NEW.id AND purpose='card';
 INSERT OR IGNORE INTO discord_cards(id,entity_type,entity_id,purpose,created)
 SELECT 'auction:'||NEW.id||':result','auction',NEW.id,'result',unixepoch() WHERE OLD.status<>NEW.status AND NEW.status IN ('closed','cancelled');
END;
