ALTER TABLE `detail_user_group` ADD `message` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `groups` ADD `deleted` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `deleted` int DEFAULT 0;