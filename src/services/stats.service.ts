import { sql, eq, and, desc, count } from "drizzle-orm";
import {
  getDbType,
  getMysqlDb,
  getSqliteDb,
} from "../db";
import { userStatsMySQL, userStatsSQLite } from "../db/schema";

export interface UserStat {
  user_id: number;
  username?: string | null;
  first_name: string;
  last_name?: string | null;
  message_count: number;
  word_count: number;
  average_words: number;
  sticker_count: number;
  media_count: number;
  createdAt: string | Date;
  updatedAt: string | Date;

  // Aggregated fields
  group_id?: number;
  group_title?: string | null;
  group_username?: string | null;
}

export const statsService = {
  async getUserStat(userId: number, groupId: number): Promise<UserStat | null> {
    const dbType = getDbType();

    if (dbType === "sqlite") {
      const db = getSqliteDb();
      const result = await db
        .select({
          user_id: userStatsSQLite.user_id,
          group_id: userStatsSQLite.group_id,
          username: userStatsSQLite.username,
          first_name: userStatsSQLite.first_name,
          last_name: userStatsSQLite.last_name,
          group_title: userStatsSQLite.group_title,
          group_username: userStatsSQLite.group_username,
          message_count: userStatsSQLite.message_count,
          word_count: userStatsSQLite.word_count,
          average_words: sql<number>`(CASE WHEN ${userStatsSQLite.message_count} > 0 THEN CAST(CEILING(CAST(${userStatsSQLite.word_count} AS REAL) / ${userStatsSQLite.message_count}) AS INTEGER) ELSE 0 END)`,
          sticker_count: userStatsSQLite.sticker_count,
          media_count: userStatsSQLite.media_count,
          createdAt: userStatsSQLite.createdAt,
          updatedAt: userStatsSQLite.updatedAt,
        })
        .from(userStatsSQLite)
        .where(
          and(
            eq(userStatsSQLite.user_id, userId),
            eq(userStatsSQLite.group_id, groupId)
          )
        )
        .limit(1);

      return (result[0] as unknown as UserStat) || null;
    } else {
      const db = getMysqlDb();
      const result = await db
        .select({
          user_id: userStatsMySQL.user_id,
          group_id: userStatsMySQL.group_id,
          username: userStatsMySQL.username,
          first_name: userStatsMySQL.first_name,
          last_name: userStatsMySQL.last_name,
          group_title: userStatsMySQL.group_title,
          group_username: userStatsMySQL.group_username,
          message_count: userStatsMySQL.message_count,
          word_count: userStatsMySQL.word_count,
          average_words: sql<number>`(CASE WHEN ${userStatsMySQL.message_count} > 0 THEN CEIL(${userStatsMySQL.word_count} / ${userStatsMySQL.message_count}) ELSE 0 END)`,
          sticker_count: userStatsMySQL.sticker_count,
          media_count: userStatsMySQL.media_count,
          createdAt: userStatsMySQL.createdAt,
          updatedAt: userStatsMySQL.updatedAt,
        })
        .from(userStatsMySQL)
        .where(
          and(
            eq(userStatsMySQL.user_id, userId),
            eq(userStatsMySQL.group_id, groupId)
          )
        )
        .limit(1);

      return (result[0] as unknown as UserStat) || null;
    }
  },

  async getAggregatedUserStat(userId: number): Promise<UserStat | null> {
    const dbType = getDbType();

    if (dbType === "sqlite") {
      const db = getSqliteDb();
      const result = await db
        .select({
          user_id: userStatsSQLite.user_id,
          username: sql<string>`MAX(${userStatsSQLite.username})`,
          first_name: sql<string>`MAX(${userStatsSQLite.first_name})`,
          last_name: sql<string>`MAX(${userStatsSQLite.last_name})`,
          message_count: sql<number>`SUM(${userStatsSQLite.message_count})`,
          word_count: sql<number>`SUM(${userStatsSQLite.word_count})`,
          average_words: sql<number>`(CASE WHEN SUM(${userStatsSQLite.message_count}) > 0 THEN CAST(CEILING(CAST(SUM(${userStatsSQLite.word_count}) AS REAL) / SUM(${userStatsSQLite.message_count})) AS INTEGER) ELSE 0 END)`,
          sticker_count: sql<number>`SUM(${userStatsSQLite.sticker_count})`,
          media_count: sql<number>`SUM(${userStatsSQLite.media_count})`,
          createdAt: sql<string>`MIN(${userStatsSQLite.createdAt})`,
          updatedAt: sql<string>`MAX(${userStatsSQLite.updatedAt})`,
        })
        .from(userStatsSQLite)
        .where(eq(userStatsSQLite.user_id, userId))
        .groupBy(userStatsSQLite.user_id);

      return (result[0] as unknown as UserStat) || null;
    } else {
      const db = getMysqlDb();
      const result = await db
        .select({
          user_id: userStatsMySQL.user_id,
          username: sql<string>`MAX(${userStatsMySQL.username})`,
          first_name: sql<string>`MAX(${userStatsMySQL.first_name})`,
          last_name: sql<string>`MAX(${userStatsMySQL.last_name})`,
          message_count: sql<number>`SUM(${userStatsMySQL.message_count})`,
          word_count: sql<number>`SUM(${userStatsMySQL.word_count})`,
          average_words: sql<number>`(CASE WHEN SUM(${userStatsMySQL.message_count}) > 0 THEN CEIL(SUM(${userStatsMySQL.word_count}) / SUM(${userStatsMySQL.message_count})) ELSE 0 END)`,
          sticker_count: sql<number>`SUM(${userStatsMySQL.sticker_count})`,
          media_count: sql<number>`SUM(${userStatsMySQL.media_count})`,
          createdAt: sql<string>`MIN(${userStatsMySQL.createdAt})`,
          updatedAt: sql<string>`MAX(${userStatsMySQL.updatedAt})`,
        })
        .from(userStatsMySQL)
        .where(eq(userStatsMySQL.user_id, userId))
        .groupBy(userStatsMySQL.user_id);

      return (result[0] as unknown as UserStat) || null;
    }
  },

  async getTopUsers({ limit, offset }: { limit: number; offset: number }): Promise<UserStat[]> {
    const dbType = getDbType();

    if (dbType === "sqlite") {
      const db = getSqliteDb();
      const result = await db
        .select({
          user_id: userStatsSQLite.user_id,
          username: sql<string>`MAX(${userStatsSQLite.username})`,
          first_name: sql<string>`MAX(${userStatsSQLite.first_name})`,
          last_name: sql<string>`MAX(${userStatsSQLite.last_name})`,
          message_count: sql<number>`SUM(${userStatsSQLite.message_count})`,
          word_count: sql<number>`SUM(${userStatsSQLite.word_count})`,
          average_words: sql<number>`(CASE WHEN SUM(${userStatsSQLite.message_count}) > 0 THEN CAST(CEILING(CAST(SUM(${userStatsSQLite.word_count}) AS REAL) / SUM(${userStatsSQLite.message_count})) AS INTEGER) ELSE 0 END)`,
          sticker_count: sql<number>`SUM(${userStatsSQLite.sticker_count})`,
          media_count: sql<number>`SUM(${userStatsSQLite.media_count})`,
          createdAt: sql<string>`MIN(${userStatsSQLite.createdAt})`,
          updatedAt: sql<string>`MAX(${userStatsSQLite.updatedAt})`,
        })
        .from(userStatsSQLite)
        .groupBy(userStatsSQLite.user_id)
        .orderBy(desc(sql`SUM(${userStatsSQLite.message_count})`))
        .limit(limit)
        .offset(offset);

      return result as unknown as UserStat[];
    } else {
      const db = getMysqlDb();
      const result = await db
        .select({
          user_id: userStatsMySQL.user_id,
          username: sql<string>`MAX(${userStatsMySQL.username})`,
          first_name: sql<string>`MAX(${userStatsMySQL.first_name})`,
          last_name: sql<string>`MAX(${userStatsMySQL.last_name})`,
          message_count: sql<number>`SUM(${userStatsMySQL.message_count})`,
          word_count: sql<number>`SUM(${userStatsMySQL.word_count})`,
          average_words: sql<number>`(CASE WHEN SUM(${userStatsMySQL.message_count}) > 0 THEN CEIL(SUM(${userStatsMySQL.word_count}) / SUM(${userStatsMySQL.message_count})) ELSE 0 END)`,
          sticker_count: sql<number>`SUM(${userStatsMySQL.sticker_count})`,
          media_count: sql<number>`SUM(${userStatsMySQL.media_count})`,
          createdAt: sql<string>`MIN(${userStatsMySQL.createdAt})`,
          updatedAt: sql<string>`MAX(${userStatsMySQL.updatedAt})`,
        })
        .from(userStatsMySQL)
        .groupBy(userStatsMySQL.user_id)
        .orderBy(desc(sql`SUM(${userStatsMySQL.message_count})`))
        .limit(limit)
        .offset(offset);

      return result as unknown as UserStat[];
    }
  },

  async getTotalUsersCount(): Promise<{ count: number }> {
    const dbType = getDbType();
    
    // Drizzle count() helper is useful
    if (dbType === "sqlite") {
      const db = getSqliteDb();
      const result = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${userStatsSQLite.user_id})` })
        .from(userStatsSQLite);
      return { count: result[0]?.count || 0 };
    } else {
      const db = getMysqlDb();
      const result = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${userStatsMySQL.user_id})` })
        .from(userStatsMySQL);
      return { count: result[0]?.count || 0 };
    }
  },

  async upsertUserStat(data: {
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
    const dbType = getDbType();
    const now = new Date();

    const isTextOrMedia = data.isText || data.isMedia || data.isSticker;

    if (dbType === "sqlite") {
      const db = getSqliteDb();
      const nowStr = now.toISOString().replace("T", " ").replace("Z", "");

      await db
        .insert(userStatsSQLite)
        .values({
          user_id: data.userId,
          group_id: data.groupId,
          username: data.username || null,
          first_name: data.firstName,
          last_name: data.lastName || null,
          group_title: data.groupTitle || null,
          group_username: data.groupUsername || null,
          message_count: isTextOrMedia ? 1 : 0,
          word_count: data.wordCount || 0,
          sticker_count: data.isSticker ? 1 : 0,
          media_count: data.isMedia ? 1 : 0,
          createdAt: nowStr,
          updatedAt: nowStr,
        })
        .onConflictDoUpdate({
          target: [userStatsSQLite.user_id, userStatsSQLite.group_id],
          set: {
            username: data.username || null,
            first_name: data.firstName,
            last_name: data.lastName || null,
            group_title: data.groupTitle || null,
            group_username: data.groupUsername || null,
            message_count: sql`${userStatsSQLite.message_count} + ${isTextOrMedia ? 1 : 0}`,
            word_count: sql`${userStatsSQLite.word_count} + ${data.wordCount || 0}`,
            sticker_count: sql`${userStatsSQLite.sticker_count} + ${data.isSticker ? 1 : 0}`,
            media_count: sql`${userStatsSQLite.media_count} + ${data.isMedia ? 1 : 0}`,
            updatedAt: nowStr,
          },
        });
    } else {
      const db = getMysqlDb();
      
      await db
        .insert(userStatsMySQL)
        .values({
          user_id: data.userId,
          group_id: data.groupId,
          username: data.username || null,
          first_name: data.firstName,
          last_name: data.lastName || null,
          group_title: data.groupTitle || null,
          group_username: data.groupUsername || null,
          message_count: isTextOrMedia ? 1 : 0,
          word_count: data.wordCount || 0,
          sticker_count: data.isSticker ? 1 : 0,
          media_count: data.isMedia ? 1 : 0,
          createdAt: now,
          updatedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            username: data.username || null,
            first_name: data.firstName,
            last_name: data.lastName || null,
            group_title: data.groupTitle || null,
            group_username: data.groupUsername || null,
            message_count: sql`message_count + ${isTextOrMedia ? 1 : 0}`,
            word_count: sql`word_count + ${data.wordCount || 0}`,
            sticker_count: sql`sticker_count + ${data.isSticker ? 1 : 0}`,
            media_count: sql`media_count + ${data.isMedia ? 1 : 0}`,
            updatedAt: now,
          },
        });
    }
  },

  formatStatsMessage(userStats: UserStat, user: { firstName: string; lastName?: string }): string {
    return (
      `📊 *Your Statistics*\n\n` +
      `👤 Name: ${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}\n` +
      `💬 Messages: ${userStats.message_count || 0}\n` +
      `📝 Words: ${userStats.word_count || 0}\n` +
      `📈 Avg. words/msg: ${userStats.average_words || 0}\n` +
      `🖼️ Media: ${userStats.media_count || 0}\n` +
      `😊 Stickers: ${userStats.sticker_count || 0}`
    );
  },
};
