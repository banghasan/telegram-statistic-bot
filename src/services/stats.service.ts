import { count, desc, eq, gt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { banned, detail_user_group, groups, users } from "../db/schema";

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

  async getGroupsForUser(userId: number) {
    const db = getDb();
    const result = await db
      .select({
        groupId: groups.id,
        title: groups.title,
        userMessageCount: detail_user_group.message,
        lastActivity: detail_user_group.updatedAt,
      })
      .from(detail_user_group)
      .innerJoin(groups, eq(detail_user_group.group_id, groups.id))
      .where(eq(detail_user_group.user_id, userId))
      .orderBy(desc(detail_user_group.message));

    return result;
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

  // biome-ignore lint/suspicious/noExplicitAny: Context type is complex and we want flexibility
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
    const wordCount = text
      .trim()
      .split(/\s+/)
      .filter((w: string) => w.length > 0).length;

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
          message: 1,
          createdAt: now,
          updatedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            message: sql`message + 1`,
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

  // biome-ignore lint/suspicious/noExplicitAny: Context type is complex
  async processEditedMessage(ctx: any) {
    const db = getDb();
    const chat = ctx.chat;
    const user = ctx.from;

    if (!user) return;

    // Check if banned
    if (await this.isBanned(user.id)) return;
    if (chat.type !== "private" && (await this.isBanned(chat.id))) return;

    const now = new Date();
    const isPrivate = chat.type === "private";

    // --- 1. Update Users Table (Increment edited_message) ---
    // We only update if the user exists. If they don't exist (rare for edit), we probably shouldn't create them just for an edit
    // or maybe we should? Standard logic usually implies active participation.
    // Let's use INSERT ON DUPLICATE KEY UPDATE to be safe and consistent with processMessage.

    await db
      .insert(users)
      .values({
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName || null,
        message: 0, // It's an edit, not a new message count
        edited_message: 1,
        words: 0,
        average: 0,
        sticker: 0,
        media: 0,
        last_activity: "edit",
        createdAt: now,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          first_name: user.firstName,
          last_name: user.lastName || null,
          edited_message: sql`edited_message + 1`,
          last_activity: "edit",
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
          message: 0,
          edited_message: 1,
          words: 0,
          average: 0,
          sticker: 0,
          media: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            title: chat.title || "",
            username: chat.username || null,
            edited_message: sql`edited_message + 1`,
            updatedAt: now,
          },
        });

      // We don't necessarily need to update detail_user_group or aggregates for just an edit
    }
  },

  // biome-ignore lint/suspicious/noExplicitAny: Context type is complex
  async processMessageDelete(ctx: any) {
    const db = getDb();
    const chat = ctx.chat;
    const user = ctx.from;

    if (!user) return;
    if (chat.type === "private") return;

    // Check if banned
    if (await this.isBanned(user.id)) return;
    if (await this.isBanned(chat.id)) return;

    const now = new Date();

    // --- 1. Update Users Table ---
    await db
      .update(users)
      .set({
        deleted: sql`deleted + 1`,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    // --- 2. Update Groups Table ---
    await db
      .update(groups)
      .set({
        deleted: sql`deleted + 1`,
        updatedAt: now,
      })
      .where(eq(groups.id, chat.id));
  },

  formatStatsMessage(
    // biome-ignore lint/suspicious/noExplicitAny: User stats object is dynamic
    userStats: any,
    user: { firstName: string; lastName?: string },
  ): string {
    return (
      `📊 *Your Statistics*\n` +
      ` ├ 👤 Name: ${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}\n` +
      ` ├ 💬 Messages: ${userStats.message || 0}\n` +
      ` ├ 📝 Edited: ${userStats.edited_message || 0}\n` +
      ` ├ 📑 Words: ${userStats.words || 0}\n` +
      ` ├ 📈 Avg : ${userStats.average || 0} Word/Message\n` +
      ` ├ 🖼️ Media: ${userStats.media || 0}\n` +
      ` └ 😊 Stickers: ${userStats.sticker || 0}`
    );
  },
};
