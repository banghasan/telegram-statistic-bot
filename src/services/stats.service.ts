import { sql, eq, and, gt, desc, count } from "drizzle-orm";
import { getDb } from "../db";
import { groups, users, detail_user_group, banned } from "../db/schema";

export const statsService = {
  async getUserStat(userId: number) {
    const db = getDb();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return result[0] || null;
  },

  async getTopGroups({ page = 1, limit = 5 }: { page: number; limit: number }) {
    const db = getDb();
    const offset = (page - 1) * limit;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const result = await db
      .select()
      .from(groups)
      .where(gt(groups.updatedAt, threeMonthsAgo))
      .orderBy(desc(groups.message))
      .limit(limit)
      .offset(offset);
      
    const countResult = await db
      .select({ count: count() })
      .from(groups)
      .where(gt(groups.updatedAt, threeMonthsAgo));

    return { data: result, total: countResult[0]?.count || 0 };
  },

  async getTopUsers({ page = 1, limit = 5 }: { page: number; limit: number }) {
    const db = getDb();
    const offset = (page - 1) * limit;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const result = await db
      .select()
      .from(users)
      .where(gt(users.updatedAt, threeMonthsAgo))
      .orderBy(desc(users.message))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: count() })
      .from(users)
      .where(gt(users.updatedAt, threeMonthsAgo));

    return { data: result, total: countResult[0]?.count || 0 };
  },

  async isBanned(id: number): Promise<boolean> {
    const db = getDb();
    const result = await db
      .select({ id: banned.id })
      .from(banned)
      .where(eq(banned.id, id))
      .limit(1);
    return result.length > 0;
  },

  async processMessage(ctx: any) {
    const db = getDb();
    const chat = ctx.chat;
    const user = ctx.from;

    if (!user) return;

    // Check if banned
    if (await this.isBanned(user.id)) return;
    if (chat.type !== "private" && (await this.isBanned(chat.id))) return;

    const now = new Date();
    const isPrivate = chat.type === "private";

    // Analyze message content
    const text = ctx.text || ctx.caption || "";
    const isSticker = !!ctx.sticker;
    const isMedia = !!(
      ctx.photo ||
      ctx.video ||
      ctx.audio ||
      ctx.document ||
      ctx.voice ||
      ctx.video_note
    );
    const wordCount = text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;

    // --- 1. Update Users Table ---
    await db
      .insert(users)
      .values({
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName || null,
        message: 1,
        words: wordCount,
        average: wordCount,
        sticker: isSticker ? 1 : 0,
        media: isMedia ? 1 : 0,
        last_activity: isSticker
          ? "sticker"
          : isMedia
          ? "media"
          : text
          ? "text"
          : "other",
        createdAt: now,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          first_name: user.firstName,
          last_name: user.lastName || null,
          message: sql`message + 1`,
          words: sql`words + ${wordCount}`,
          average: sql`CEIL((words + ${wordCount}) / (message + 1))`,
          sticker: sql`sticker + ${isSticker ? 1 : 0}`,
          media: sql`media + ${isMedia ? 1 : 0}`,
          last_activity: isSticker
            ? "sticker"
            : isMedia
            ? "media"
            : text
            ? "text"
            : "other",
          updatedAt: now,
        },
      });

    // --- 2. Update Groups Table (if not private) ---
    if (!isPrivate) {
      await db
        .insert(groups)
        .values({
          id: chat.id,
          type: chat.type,
          title: chat.title || "",
          username: chat.username || null,
          users: 1,
          user_active: 1,
          message: 1,
          words: wordCount,
          average: wordCount,
          sticker: isSticker ? 1 : 0,
          media: isMedia ? 1 : 0,
          createdAt: now,
          updatedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            title: chat.title || "",
            username: chat.username || null,
            message: sql`message + 1`,
            words: sql`words + ${wordCount}`,
            average: sql`CEIL((words + ${wordCount}) / (message + 1))`,
            sticker: sql`sticker + ${isSticker ? 1 : 0}`,
            media: sql`media + ${isMedia ? 1 : 0}`,
            updatedAt: now,
          },
        });

      // --- 3. Update Detail User Group ---
      await db
        .insert(detail_user_group)
        .values({
          user_id: user.id,
          group_id: chat.id,
          createdAt: now,
          updatedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            updatedAt: now,
          },
        });

      // Update aggregate counts
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      await db.execute(sql`
        UPDATE groups 
        SET 
          users = (SELECT COUNT(*) FROM detail_user_group WHERE group_id = ${chat.id}),
          user_active = (
            SELECT COUNT(*) 
            FROM detail_user_group d
            JOIN users u ON d.user_id = u.id
            WHERE d.group_id = ${chat.id} AND u.updatedAt > ${thirtyDaysAgo}
          )
        WHERE id = ${chat.id}
      `);
    }
  },

  formatStatsMessage(userStats: any, user: { firstName: string; lastName?: string }): string {
    return (
      `📊 *Your Statistics*\n\n` +
      `👤 Name: ${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}\n` +
      `💬 Messages: ${userStats.message || 0}\n` +
      `📝 Words: ${userStats.words || 0}\n` +
      `📈 Avg. words/msg: ${userStats.average || 0}\n` +
      `🖼️ Media: ${userStats.media || 0}\n` +
      `😊 Stickers: ${userStats.sticker || 0}`
    );
  },
};
