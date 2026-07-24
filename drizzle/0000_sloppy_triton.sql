CREATE TABLE `custom_soups` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`difficulty` text DEFAULT '新作' NOT NULL,
	`play_time` text DEFAULT '约 10 分钟' NOT NULL,
	`surface` text NOT NULL,
	`truth` text NOT NULL,
	`hint` text NOT NULL,
	`key_facts` text NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
