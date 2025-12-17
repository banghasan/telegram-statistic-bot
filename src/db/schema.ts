import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  datetime,
  float,
  int,
  mysqlTable,
  primaryKey,
  varchar,
} from "drizzle-orm/mysql-core";

// --- MySQL / MariaDB Schema ---

export const groups = mysqlTable("groups", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // group, supergroup, channel
  title: varchar("title", { length: 255 }),
  username: varchar("username", { length: 255 }),
  users: int("users").default(0), // Total users who sent messages
  user_active: int("user_active").default(0), // Active users (< 30 days)
  message: int("message").default(0),
  edited_message: int("edited_message").default(0),
  words: int("words").default(0),
  average: float("average").default(0), // words/message (ceil)
  sticker: int("sticker").default(0),
  media: int("media").default(0),
  deleted: int("deleted").default(0),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  first_name: varchar("first_name", { length: 255 }).notNull(),
  last_name: varchar("last_name", { length: 255 }),
  message: int("message").default(0),
  edited_message: int("edited_message").default(0),
  words: int("words").default(0),
  average: float("average").default(0),
  sticker: int("sticker").default(0),
  media: int("media").default(0),
  deleted: int("deleted").default(0),
  last_activity: varchar("last_activity", { length: 255 }), // text/video/audio, etc
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const detail_user_group = mysqlTable(
  "detail_user_group",
  {
    user_id: bigint("user_id", { mode: "number" }).notNull(),
    group_id: bigint("group_id", { mode: "number" }).notNull(),
    message: int("message").default(0),
    createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updatedAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.user_id, table.group_id] }),
  })
);

export const banned = mysqlTable("banned", {
  id: bigint("id", { mode: "number" }).primaryKey(), // user id or group id
  type: varchar("type", { length: 50 }).notNull(), // private, group, supergroup, channel
  spammer: boolean("spammer").default(false),
  message: varchar("message", { length: 255 }), // reason
});
