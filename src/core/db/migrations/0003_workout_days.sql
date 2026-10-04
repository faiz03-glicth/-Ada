CREATE TABLE `workout_days` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	PRIMARY KEY(`user_id`, `date`)
);
