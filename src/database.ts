import { Database } from "bun:sqlite";
import mysql from "mariadb";

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

export interface DatabaseConfig {
  type: "sqlite" | "mariadb";
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  filename?: string; // For SQLite
}

// Initialize database based on configuration
class DatabaseManager {
  private dbType: "sqlite" | "mariadb";
  private sqliteDb?: Database;
  private mariadbConnection?: mysql.Pool;

  constructor(config: DatabaseConfig) {
    this.dbType = config.type;

    if (this.dbType === "sqlite") {
      this.sqliteDb = new Database(config.filename || "db/stats.sqlite", {
        create: true,
      });

      // Create tables for SQLite
      this.sqliteDb.run(`
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

      this.sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS users (
          user_id INTEGER PRIMARY KEY,
          username TEXT,
          first_name TEXT NOT NULL,
          last_name TEXT,
          is_banned BOOLEAN DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
    } else {
      // mariadb
      this.mariadbConnection = mysql.createPool({
        host: config.host || "localhost",
        port: config.port || 3306,
        user: config.username || "root",
        password: config.password || "",
        database: config.database || "telegram_stats",
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
      });

      // Create tables for MariaDB
      this.initializeMariaDBTables();
    }
  }

  private async initializeMariaDBTables() {
    if (!this.mariadbConnection) return;

    // Create user_stats table
    await this.mariadbConnection.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id BIGINT NOT NULL,
        group_id BIGINT NOT NULL,
        username VARCHAR(255),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        group_title VARCHAR(255),
        group_username VARCHAR(255),
        message_count INT DEFAULT 0,
        word_count INT DEFAULT 0,
        sticker_count INT DEFAULT 0,
        media_count INT DEFAULT 0,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        PRIMARY KEY (user_id, group_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create users table
    await this.mariadbConnection.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id BIGINT PRIMARY KEY,
        username VARCHAR(255),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        is_banned BOOLEAN DEFAULT FALSE,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async query(sql: string, params?: unknown[]) {
    if (this.dbType === "sqlite") {
      if (!this.sqliteDb) throw new Error("SQLite database not initialized");
      return this.sqliteDb.query(sql).all(params || []);
    } else {
      if (!this.mariadbConnection)
        throw new Error("MariaDB connection not initialized");
      return await this.mariadbConnection.query(sql, params || []);
    }
  }

  async execute(sql: string, params?: unknown[]) {
    if (this.dbType === "sqlite") {
      if (!this.sqliteDb) throw new Error("SQLite database not initialized");
      return this.sqliteDb.query(sql).run(params || []);
    } else {
      if (!this.mariadbConnection)
        throw new Error("MariaDB connection not initialized");
      return await this.mariadbConnection.query(sql, params || []);
    }
  }

  getDbType(): "sqlite" | "mariadb" {
    return this.dbType;
  }
}

// Global database instance
let dbManager: DatabaseManager;

export function initializeDatabase(config: DatabaseConfig) {
  dbManager = new DatabaseManager(config);
}

export function getDatabase(): DatabaseManager {
  if (!dbManager) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  return dbManager;
}

export async function getUserStat(
  userId: number,
  groupId: number
): Promise<UserStat | null> {
  const db = getDatabase();
  const dbType = db.getDbType();

  let queryResult: any[];

  if (dbType === "sqlite") {
    queryResult = await db.query(
      `
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
          (CASE WHEN message_count > 0 THEN CAST(CEILING(CAST(word_count AS REAL) / message_count) AS INTEGER) ELSE 0 END) as average_words,
          sticker_count,
          media_count,
          createdAt,
          updatedAt
      FROM user_stats
      WHERE user_id = ? AND group_id = ?
    `,
      [userId, groupId]
    );
  } else {
    // mariadb
    queryResult = await db.query(
      `
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
          (CASE WHEN message_count > 0 THEN CEIL(word_count / message_count) ELSE 0 END) as average_words,
          sticker_count,
          media_count,
          createdAt,
          updatedAt
      FROM user_stats
      WHERE user_id = ? AND group_id = ?
    `,
      [userId, groupId]
    );
  }

  const result = queryResult.length > 0 ? queryResult[0] : null;
  if (result) {
    // Convert BigInt values to numbers if needed
    if (typeof result.user_id === "bigint")
      result.user_id = Number(result.user_id);
    if (typeof result.group_id === "bigint")
      result.group_id = Number(result.group_id);
    if (typeof result.message_count === "bigint")
      result.message_count = Number(result.message_count);
    if (typeof result.word_count === "bigint")
      result.word_count = Number(result.word_count);
    if (typeof result.average_words === "bigint")
      result.average_words = Number(result.average_words);
    if (typeof result.sticker_count === "bigint")
      result.sticker_count = Number(result.sticker_count);
    if (typeof result.media_count === "bigint")
      result.media_count = Number(result.media_count);
  }
  return result;
}

export async function getAggregatedUserStat(
  userId: number
): Promise<UserStat | null> {
  const db = getDatabase();
  const dbType = db.getDbType();

  let queryResult: any[];

  if (dbType === "sqlite") {
    queryResult = await db.query(
      `
      SELECT
          user_id,
          MAX(username) as username,
          MAX(first_name) as first_name,
          MAX(last_name) as last_name,
          SUM(message_count) as message_count,
          SUM(word_count) as word_count,
          (CASE WHEN SUM(message_count) > 0 THEN CAST(CEILING(CAST(SUM(word_count) AS REAL) / SUM(message_count)) AS INTEGER) ELSE 0 END) as average_words,
          SUM(sticker_count) as sticker_count,
          SUM(media_count) as media_count,
          MIN(createdAt) as createdAt,
          MAX(updatedAt) as updatedAt
      FROM user_stats
      WHERE user_id = ?
      GROUP BY user_id
    `,
      [userId]
    );
  } else {
    // mariadb
    queryResult = await db.query(
      `
      SELECT
          user_id,
          MAX(username) as username,
          MAX(first_name) as first_name,
          MAX(last_name) as last_name,
          SUM(message_count) as message_count,
          SUM(word_count) as word_count,
          (CASE WHEN SUM(message_count) > 0 THEN CEIL(SUM(word_count) / SUM(message_count)) ELSE 0 END) as average_words,
          SUM(sticker_count) as sticker_count,
          SUM(media_count) as media_count,
          MIN(createdAt) as createdAt,
          MAX(updatedAt) as updatedAt
      FROM user_stats
      WHERE user_id = ?
      GROUP BY user_id
    `,
      [userId]
    );
  }

  const result = queryResult.length > 0 ? queryResult[0] : null;
  if (result) {
    // Convert BigInt values to numbers if needed
    if (typeof result.user_id === "bigint")
      result.user_id = Number(result.user_id);
    if (typeof result.message_count === "bigint")
      result.message_count = Number(result.message_count);
    if (typeof result.word_count === "bigint")
      result.word_count = Number(result.word_count);
    if (typeof result.average_words === "bigint")
      result.average_words = Number(result.average_words);
    if (typeof result.sticker_count === "bigint")
      result.sticker_count = Number(result.sticker_count);
    if (typeof result.media_count === "bigint")
      result.media_count = Number(result.media_count);
  }
  return result;
}

export async function getTopUsers({
  limit,
  offset,
}: {
  limit: number;
  offset: number;
}): Promise<UserStat[]> {
  const db = getDatabase();
  const dbType = db.getDbType();

  let queryResult: any[];

  if (dbType === "sqlite") {
    queryResult = await db.query(
      `
      SELECT
          user_id,
          MAX(username) as username,
          MAX(first_name) as first_name,
          MAX(last_name) as last_name,
          SUM(message_count) as message_count,
          SUM(word_count) as word_count,
          (CASE WHEN SUM(message_count) > 0 THEN CAST(CEILING(CAST(SUM(word_count) AS REAL) / SUM(message_count)) AS INTEGER) ELSE 0 END) as average_words,
          SUM(sticker_count) as sticker_count,
          SUM(media_count) as media_count,
          MIN(createdAt) as createdAt,
          MAX(updatedAt) as updatedAt
      FROM user_stats
      GROUP BY user_id
      ORDER BY message_count DESC
      LIMIT ? OFFSET ?
    `,
      [limit, offset]
    );
  } else {
    // mariadb
    queryResult = await db.query(
      `
      SELECT
          user_id,
          MAX(username) as username,
          MAX(first_name) as first_name,
          MAX(last_name) as last_name,
          SUM(message_count) as message_count,
          SUM(word_count) as word_count,
          (CASE WHEN SUM(message_count) > 0 THEN CEIL(SUM(word_count) / SUM(message_count)) ELSE 0 END) as average_words,
          SUM(sticker_count) as sticker_count,
          SUM(media_count) as media_count,
          MIN(createdAt) as createdAt,
          MAX(updatedAt) as updatedAt
      FROM user_stats
      GROUP BY user_id
      ORDER BY message_count DESC
      LIMIT ? OFFSET ?
    `,
      [limit, offset]
    );
  }

  // Convert BigInt values to numbers if needed for all results
  return queryResult.map((result) => {
    if (result) {
      if (typeof result.user_id === "bigint")
        result.user_id = Number(result.user_id);
      if (typeof result.message_count === "bigint")
        result.message_count = Number(result.message_count);
      if (typeof result.word_count === "bigint")
        result.word_count = Number(result.word_count);
      if (typeof result.average_words === "bigint")
        result.average_words = Number(result.average_words);
      if (typeof result.sticker_count === "bigint")
        result.sticker_count = Number(result.sticker_count);
      if (typeof result.media_count === "bigint")
        result.media_count = Number(result.media_count);
    }
    return result;
  });
}

export async function getTotalUsersCount(): Promise<{ count: number }> {
  const db = getDatabase();

  const queryResult = await db.query(
    `SELECT COUNT(DISTINCT user_id) as count FROM user_stats`
  );

  const result = queryResult.length > 0 ? queryResult[0] : { count: 0 };
  if (result && typeof result.count === "bigint") {
    result.count = Number(result.count);
  }
  return result;
}

export async function getGroupTopUsers(
  groupId: number,
  limit = 10
): Promise<UserStat[]> {
  const db = getDatabase();
  const dbType = db.getDbType();

  let queryResult: any[];

  if (dbType === "sqlite") {
    queryResult = await db.query(
      `
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
          (CASE WHEN message_count > 0 THEN CAST(CEILING(CAST(word_count AS REAL) / message_count) AS INTEGER) ELSE 0 END) as average_words,
          sticker_count,
          media_count,
          createdAt,
          updatedAt
      FROM user_stats
      WHERE group_id = ?
      ORDER BY message_count DESC
      LIMIT ?
    `,
      [groupId, limit]
    );
  } else {
    // mariadb
    queryResult = await db.query(
      `
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
          (CASE WHEN message_count > 0 THEN CEIL(word_count / message_count) ELSE 0 END) as average_words,
          sticker_count,
          media_count,
          createdAt,
          updatedAt
      FROM user_stats
      WHERE group_id = ?
      ORDER BY message_count DESC
      LIMIT ?
    `,
      [groupId, limit]
    );
  }

  // Convert BigInt values to numbers if needed for all results
  return queryResult.map((result) => {
    if (result) {
      if (typeof result.user_id === "bigint")
        result.user_id = Number(result.user_id);
      if (typeof result.group_id === "bigint")
        result.group_id = Number(result.group_id);
      if (typeof result.message_count === "bigint")
        result.message_count = Number(result.message_count);
      if (typeof result.word_count === "bigint")
        result.word_count = Number(result.word_count);
      if (typeof result.average_words === "bigint")
        result.average_words = Number(result.average_words);
      if (typeof result.sticker_count === "bigint")
        result.sticker_count = Number(result.sticker_count);
      if (typeof result.media_count === "bigint")
        result.media_count = Number(result.media_count);
    }
    return result;
  });
}

export async function upsertUserStat(data: {
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
  const now = new Date().toISOString().replace("T", " ").replace("Z", "");
  const existing = await getUserStat(data.userId, data.groupId);

  const db = getDatabase();
  const dbType = db.getDbType();

  if (existing) {
    // Update existing record
    if (dbType === "sqlite") {
      await db.execute(
        `
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
      `,
        [
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
        ]
      );
    } else {
      // mariadb
      await db.execute(
        `
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
      `,
        [
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
        ]
      );
    }
  } else {
    // Insert new record
    if (dbType === "sqlite") {
      await db.execute(
        `
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
      `,
        [
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
        ]
      );
    } else {
      // mariadb
      await db.execute(
        `
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
      `,
        [
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
        ]
      );
    }
  }
}

export async function getGroups(
  _adminId: number
): Promise<{ id: number; title: string }[]> {
  // Now this can return more meaningful titles
  const db = getDatabase();
  const dbType = db.getDbType();

  let queryResult: any[];

  if (dbType === "sqlite") {
    queryResult = await db.query(`
      SELECT DISTINCT group_id as id, COALESCE(group_title, 'Group ' || group_id) as title
      FROM user_stats
    `);
  } else {
    // mariadb
    queryResult = await db.query(`
      SELECT DISTINCT group_id as id, COALESCE(group_title, CONCAT('Group ', group_id)) as title
      FROM user_stats
    `);
  }

  return queryResult;
}

// User profile and ban management functions
export interface UserProfile {
  user_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export async function getUserProfile(
  userId: number
): Promise<UserProfile | null> {
  const db = getDatabase();

  const queryResult = await db.query(
    `
    SELECT user_id, username, first_name, last_name, is_banned, created_at, updated_at
    FROM users
    WHERE user_id = ?
  `,
    [userId]
  );

  const result = queryResult.length > 0 ? queryResult[0] : null;
  if (result && typeof result.user_id === "bigint") {
    result.user_id = Number(result.user_id);
  }
  return result;
}

export async function upsertUserProfile(
  userId: number,
  username?: string,
  firstName: string = "",
  lastName?: string,
  isBanned: boolean = false
): Promise<void> {
  const now = new Date().toISOString().replace("T", " ").replace("Z", "");
  const existing = await getUserProfile(userId);

  const db = getDatabase();

  if (existing) {
    await db.execute(
      `
      UPDATE users
      SET username = ?, first_name = ?, last_name = ?, is_banned = ?, updated_at = ?
      WHERE user_id = ?
    `,
      [username, firstName, lastName, isBanned ? 1 : 0, now, userId]
    );
  } else {
    await db.execute(
      `
      INSERT INTO users (user_id, username, first_name, last_name, is_banned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [userId, username, firstName, lastName, isBanned ? 1 : 0, now, now]
    );
  }
}

export async function banUser(userId: number): Promise<void> {
  const now = new Date().toISOString();
  const db = getDatabase();

  await db.execute(
    `
    UPDATE users
    SET is_banned = 1, updated_at = ?
    WHERE user_id = ?
  `,
    [now, userId]
  );
}

export async function unbanUser(userId: number): Promise<void> {
  const now = new Date().toISOString();
  const db = getDatabase();

  await db.execute(
    `
    UPDATE users
    SET is_banned = 0, updated_at = ?
    WHERE user_id = ?
  `,
    [now, userId]
  );
}

export async function isUserBanned(userId: number): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return profile ? profile.is_banned : false;
}
