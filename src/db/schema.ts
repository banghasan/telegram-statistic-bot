import { sql } from "drizzle-orm";
import {
  int,
  integer,
  sqliteTable,
  text,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import {
  bigint,
  boolean,
  datetime,
  int as mysqlInt,
  mysqlTable,
  primaryKey as mysqlPrimaryKey,
  varchar,
} from "drizzle-orm/mysql-core";

// --- SQLite Schema ---

export const usersSQLite = sqliteTable("users", {
  user_id: integer("user_id").primaryKey(),
  username: text("username"),
  first_name: text("first_name").notNull(),
  last_name: text("last_name"),
  is_banned: integer("is_banned", { mode: "boolean" }).default(false),
  created_at: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const userStatsSQLite = sqliteTable(
  "user_stats",
  {
    user_id: integer("user_id").notNull(),
    group_id: integer("group_id").notNull(),
    username: text("username"),
    first_name: text("first_name").notNull(),
    last_name: text("last_name"),
    group_title: text("group_title"),
    group_username: text("group_username"),
    message_count: integer("message_count").default(0),
    word_count: integer("word_count").default(0),
    sticker_count: integer("sticker_count").default(0),
    media_count: integer("media_count").default(0),
    createdAt: text("createdAt")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updatedAt")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.user_id, table.group_id] }),
  })
);

// --- MySQL / MariaDB Schema ---

export const usersMySQL = mysqlTable("users", {
  user_id: bigint("user_id", { mode: "number" }).primaryKey(),
  username: varchar("username", { length: 255 }),
  first_name: varchar("first_name", { length: 255 }).notNull(),
  last_name: varchar("last_name", { length: 255 }),
  is_banned: boolean("is_banned").default(false),
  created_at: datetime("created_at").notNull(),
  updated_at: datetime("updated_at").notNull(),
});

export const userStatsMySQL = mysqlTable(
  "user_stats",
  {
    user_id: bigint("user_id", { mode: "number" }).notNull(),
    group_id: bigint("group_id", { mode: "number" }).notNull(),
    username: varchar("username", { length: 255 }),
    first_name: varchar("first_name", { length: 255 }).notNull(),
    last_name: varchar("last_name", { length: 255 }),
    group_title: varchar("group_title", { length: 255 }),
    group_username: varchar("group_username", { length: 255 }),
    message_count: mysqlInt("message_count").default(0),
    word_count: mysqlInt("word_count").default(0),
    sticker_count: mysqlInt("sticker_count").default(0),
    media_count: mysqlInt("media_count").default(0),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    pk: mysqlPrimaryKey({ columns: [table.user_id, table.group_id] }),
  })
);
