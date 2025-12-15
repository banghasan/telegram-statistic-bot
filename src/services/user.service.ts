import { eq } from "drizzle-orm";
import {
  getDbType,
  getMysqlDb,
  getSqliteDb,
  type DBType,
} from "../db";
import { usersMySQL, usersSQLite } from "../db/schema";

export interface UserProfile {
  user_id: number;
  username?: string | null;
  first_name: string;
  last_name?: string | null;
  is_banned: boolean | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export const userService = {
  async getUserProfile(userId: number): Promise<UserProfile | null> {
    const dbType = getDbType();

    if (dbType === "sqlite") {
      const db = getSqliteDb();
      const result = await db
        .select()
        .from(usersSQLite)
        .where(eq(usersSQLite.user_id, userId))
        .limit(1);
      
      // Drizzle SQLite returns objects matching the schema.
      // We might need to map them if types strictly don't match Promise<UserProfile>
      // The schema defines 'username' as text | null, interface says string | null. Should be fine.
      return result[0] || null;
    } else {
      const db = getMysqlDb();
      const result = await db
        .select()
        .from(usersMySQL)
        .where(eq(usersMySQL.user_id, userId))
        .limit(1);
      
      return result[0] || null;
    }
  },

  async upsertUserProfile(
    userId: number,
    username?: string,
    firstName: string = "",
    lastName?: string,
    isBanned: boolean = false
  ): Promise<void> {
    const dbType = getDbType();
    const now = new Date(); // Drizzle handles Date objects for MySQL datetime, and we can format for SQLite if needed or use default

    if (dbType === "sqlite") {
      const db = getSqliteDb();
      // SQLite store dates as text usually with CURRENT_TIMESTAMP or ISO string
      // Our schema uses text with default sql`(CURRENT_TIMESTAMP)`.
      // Let's pass ISO string for consistency.
      const nowStr = now.toISOString().replace("T", " ").replace("Z", ""); // "YYYY-MM-DD HH:mm:ss.sss" approx

      await db
        .insert(usersSQLite)
        .values({
          user_id: userId,
          username: username || null,
          first_name: firstName,
          last_name: lastName || null,
          is_banned: isBanned,
          created_at: nowStr,
          updated_at: nowStr,
        })
        .onConflictDoUpdate({
          target: usersSQLite.user_id,
          set: {
            username: username || null,
            first_name: firstName,
            last_name: lastName || null,
            is_banned: isBanned,
            updated_at: nowStr,
          },
        });
    } else {
      const db = getMysqlDb();
      // MySQL driver handles Date objects for datetime columns
      await db
        .insert(usersMySQL)
        .values({
          user_id: userId,
          username: username || null,
          first_name: firstName,
          last_name: lastName || null,
          is_banned: isBanned,
          created_at: now,
          updated_at: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            username: username || null,
            first_name: firstName,
            last_name: lastName || null,
            is_banned: isBanned,
            updated_at: now,
          },
        });
    }
  },

  async isUserBanned(userId: number): Promise<boolean> {
    const profile = await this.getUserProfile(userId);
    return profile ? !!profile.is_banned : false;
  },
};
