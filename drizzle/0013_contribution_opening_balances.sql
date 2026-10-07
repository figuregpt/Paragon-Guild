CREATE TABLE `contribution_baseline_claims` (
	`name_key` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`name_key`) REFERENCES `contribution_baselines`(`name_key`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contribution_baseline_claims_member_id_unique` ON `contribution_baseline_claims` (`member_id`);--> statement-breakpoint
CREATE TABLE `contribution_baselines` (
	`name_key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`yang` integer NOT NULL,
	`pp` integer NOT NULL,
	`week` text NOT NULL,
	`weekly_pp` integer NOT NULL,
	`unit` integer NOT NULL,
	`rate` integer NOT NULL,
	`source_batch` text NOT NULL,
	`created` integer NOT NULL,
	CONSTRAINT "baseline_amount" CHECK("contribution_baselines"."yang">=0 AND "contribution_baselines"."unit">0 AND "contribution_baselines"."rate">=0 AND "contribution_baselines"."pp"=CAST("contribution_baselines"."yang"*1.0/"contribution_baselines"."unit"*"contribution_baselines"."rate" AS INTEGER) AND "contribution_baselines"."weekly_pp" BETWEEN 0 AND "contribution_baselines"."rate" AND "contribution_baselines"."weekly_pp"<="contribution_baselines"."pp")
);

--> statement-breakpoint
CREATE TRIGGER baseline_claim_active BEFORE INSERT ON contribution_baseline_claims BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM members WHERE id=NEW.member_id AND active=1) THEN RAISE(ABORT,'Guild membership is required') END;
END;
CREATE TRIGGER baseline_claim_credit AFTER INSERT ON contribution_baseline_claims BEGIN
 INSERT INTO ledger(id,member_id,amount,category,label,created)
 SELECT 'baseline:'||name_key,NEW.member_id,pp,'Deposits','Historical Contributions / '||yang||' Yang',created FROM contribution_baselines WHERE name_key=NEW.name_key AND pp>0;
END;
CREATE TRIGGER baseline_immutable_update BEFORE UPDATE ON contribution_baselines BEGIN SELECT RAISE(ABORT,'Opening contributions are immutable'); END;
CREATE TRIGGER baseline_immutable_delete BEFORE DELETE ON contribution_baselines BEGIN SELECT RAISE(ABORT,'Opening contributions are immutable'); END;
CREATE TRIGGER baseline_claim_immutable_update BEFORE UPDATE ON contribution_baseline_claims BEGIN SELECT RAISE(ABORT,'Opening contribution claims are immutable'); END;
CREATE TRIGGER baseline_claim_immutable_delete BEFORE DELETE ON contribution_baseline_claims BEGIN SELECT RAISE(ABORT,'Opening contribution claims are immutable'); END;
