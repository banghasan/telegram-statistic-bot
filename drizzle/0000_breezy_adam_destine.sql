CREATE TABLE `banned` (
	`id` bigint NOT NULL,
	`type` varchar(50) NOT NULL,
	`spammer` boolean DEFAULT false,
	`message` varchar(255),
	CONSTRAINT `banned_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `detail_user_group` (
	`user_id` bigint NOT NULL,
	`group_id` bigint NOT NULL,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `detail_user_group_user_id_group_id_pk` PRIMARY KEY(`user_id`,`group_id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` bigint NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255),
	`username` varchar(255),
	`users` int DEFAULT 0,
	`user_active` int DEFAULT 0,
	`message` int DEFAULT 0,
	`edited_message` int DEFAULT 0,
	`words` int DEFAULT 0,
	`average` float DEFAULT 0,
	`sticker` int DEFAULT 0,
	`media` int DEFAULT 0,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint NOT NULL,
	`first_name` varchar(255) NOT NULL,
	`last_name` varchar(255),
	`message` int DEFAULT 0,
	`edited_message` int DEFAULT 0,
	`words` int DEFAULT 0,
	`average` float DEFAULT 0,
	`sticker` int DEFAULT 0,
	`media` int DEFAULT 0,
	`last_activity` varchar(255),
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
