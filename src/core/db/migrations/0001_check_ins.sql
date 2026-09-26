CREATE TABLE `check_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL,
	`date` text NOT NULL,
	`minute` integer NOT NULL,
	`activity_id` text NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `check_ins_owner_date` ON `check_ins` (`user_id`,`date`);