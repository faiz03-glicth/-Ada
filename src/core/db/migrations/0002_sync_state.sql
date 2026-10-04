CREATE TABLE `sync_state` (
	`user_id` text NOT NULL,
	`stream` text NOT NULL,
	`cursor_at` text NOT NULL,
	`cursor_key` text NOT NULL,
	PRIMARY KEY(`user_id`, `stream`)
);
--> statement-breakpoint
CREATE INDEX `check_ins_owner_dirty` ON `check_ins` (`user_id`,`dirty`);