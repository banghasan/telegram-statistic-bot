import { Database } from "bun:sqlite";

export interface UserStat {
  user_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  message_count: number;
  word_count: number;
  average_words: number;
  sticker_count: number;
  media_count: number;
  createdAt: string;
  updatedAt: string;

  // These are not columns in the table, but aggregated values
  group_id?: number;
  group_title?: string;
  group_username?: string;
}

const db = new Database("db/stats.sqlite", { create: true });

// Create the table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS user_stats (
    user_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    username TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    group_title TEXT,
    group_username TEXT,
    message_count INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    sticker_count INTEGER DEFAULT 0,
    media_count INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    PRIMARY KEY (user_id, group_id)
  )
`);

export function getUserStat(userId: number, groupId: number): UserStat | null {
  const query = db.query<UserStat, [number, number]>(`
        SELECT
            user_id,
            group_id,
            username,
            first_name,
            last_name,
            group_title,
            group_username,
            message_count,
            word_count,
            (CASE WHEN message_count > 0 THEN CAST(CEILING(word_count * 1.0 / message_count) AS INTEGER) ELSE 0 END) as average_words,
            sticker_count,
            media_count,
            createdAt,
            updatedAt
        FROM user_stats
        WHERE user_id = ? AND group_id = ?
    `);
  return query.get(userId, groupId);
}

export function getAggregatedUserStat(userId: number): UserStat | null {
  const query = db.query<UserStat, number>(`
        SELECT
            user_id,
            MAX(username) as username,
            MAX(first_name) as first_name,
            MAX(last_name) as last_name,
            SUM(message_count) as message_count,
            SUM(word_count) as word_count,
            (CASE WHEN SUM(message_count) > 0 THEN CAST(CEILING(SUM(word_count) * 1.0 / SUM(message_count)) AS INTEGER) ELSE 0 END) as average_words,
            SUM(sticker_count) as sticker_count,
            SUM(media_count) as media_count,
            MIN(createdAt) as createdAt,
            MAX(updatedAt) as updatedAt
        FROM user_stats
        WHERE user_id = ?
        GROUP BY user_id
    `);
  return query.get(userId);
}

export function getTopUsers({
  limit,
  offset,
}: {
  limit: number;
  offset: number;
}): UserStat[] {
  const query = db.query<UserStat, [number, number]>(`
        SELECT
            user_id,
            MAX(username) as username,
            MAX(first_name) as first_name,
            MAX(last_name) as last_name,
            SUM(message_count) as message_count,
            SUM(word_count) as word_count,
            (CASE WHEN SUM(message_count) > 0 THEN CAST(CEILING(SUM(word_count) * 1.0 / SUM(message_count)) AS INTEGER) ELSE 0 END) as average_words,
            SUM(sticker_count) as sticker_count,
            SUM(media_count) as media_count,
            MIN(createdAt) as createdAt,
            MAX(updatedAt) as updatedAt
        FROM user_stats
        GROUP BY user_id
        ORDER BY message_count DESC
        LIMIT ? OFFSET ?
    `);
  return query.all(limit, offset);
}

export function getTotalUsersCount(): { count: number } {
  const query = db.query<{ count: number }>(
    `SELECT COUNT(DISTINCT user_id) as count FROM user_stats`,
  );
  return query.get() ?? { count: 0 };
}

export function getGroupTopUsers(groupId: number, limit = 10): UserStat[] {
  const query = db.query<UserStat, [number, number]>(`
        SELECT
            user_id,
            group_id,
            username,
            first_name,
            last_name,
            group_title,
            group_username,
            message_count,
            word_count,
            (CASE WHEN message_count > 0 THEN CAST(CEILING(word_count * 1.0 / message_count) AS INTEGER) ELSE 0 END) as average_words,
            sticker_count,
            media_count,
            createdAt,
            updatedAt
        FROM user_stats
        WHERE group_id = ?
        ORDER BY message_count DESC
        LIMIT ?
    `);
  return query.all(groupId, limit);
}

export function upsertUserStat(data: {
  userId: number;
  groupId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  groupTitle?: string;
  groupUsername?: string;
  isText?: boolean;
  isSticker?: boolean;
  isMedia?: boolean;
  wordCount?: number;
}) {
  const now = new Date().toISOString();
  const existing = getUserStat(data.userId, data.groupId);

  if (existing) {
    // Update existing record
    const query = db.prepare(`
            UPDATE user_stats
            SET
                username = ?,
                first_name = ?,
                last_name = ?,
                group_title = ?,
                group_username = ?,
                message_count = message_count + ?,
                word_count = word_count + ?,
                sticker_count = sticker_count + ?,
                media_count = media_count + ?,
                updatedAt = ?
            WHERE user_id = ? AND group_id = ?
        `);
    query.run(
      data.username || null,
      data.firstName,
      data.lastName || null,
      data.groupTitle || null,
      data.groupUsername || null,
      data.isText || data.isMedia || data.isSticker ? 1 : 0,
      data.wordCount || 0,
      data.isSticker ? 1 : 0,
      data.isMedia ? 1 : 0,
      now,
      data.userId,
      data.groupId,
    );
  } else {
    // Insert new record
    const query = db.prepare(`
            INSERT INTO user_stats (
                user_id,
                group_id,
                username,
                first_name,
                last_name,
                group_title,
                group_username,
                message_count,
                word_count,
                sticker_count,
                media_count,
                createdAt,
                updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
    query.run(
      data.userId,
      data.groupId,
      data.username || null,
      data.firstName,
      data.lastName || null,
      data.groupTitle || null,
      data.groupUsername || null,
      data.isText || data.isMedia || data.isSticker ? 1 : 0,
      data.wordCount || 0,
      data.isSticker ? 1 : 0,
      data.isMedia ? 1 : 0,
      now,
      now,
    );
  }
}

export function getGroups(adminId: number): { id: number; title: string }[] {
  // Now this can return more meaningful titles
  const query = db.query<{ id: number; title: string }>(`
        SELECT DISTINCT group_id as id, COALESCE(group_title, 'Group ' || group_id) as title
        FROM user_stats
    `);
  return query.all();
}
