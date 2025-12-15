import { Database } from "bun:sqlite";

export interface UserStat {
	user_id: number;
	group_id: number;
	first_name: string;
	last_name?: string;
	message_count: number;
	word_count: number;
	average_words: number;
	sticker_count: number;
	media_count: number;
	createdAt: string;
	updatedAt: string;
}

const db = new Database("db/stats.sqlite", { create: true });

// Create the table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS user_stats (
    user_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
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
            first_name,
            last_name,
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

export function getGroupTopUsers(groupId: number, limit = 10): UserStat[] {
	const query = db.query<UserStat, [number, number]>(`
        SELECT
            user_id,
            group_id,
            first_name,
            last_name,
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
	firstName: string;
	lastName?: string;
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
                first_name = ?,
                last_name = ?,
                message_count = message_count + ?,
                word_count = word_count + ?,
                sticker_count = sticker_count + ?,
                media_count = media_count + ?,
                updatedAt = ?
            WHERE user_id = ? AND group_id = ?
        `);
		query.run(
			data.firstName,
			data.lastName || null,
			data.isText ? 1 : 0,
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
                first_name,
                last_name,
                message_count,
                word_count,
                sticker_count,
                media_count,
                createdAt,
                updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
		query.run(
			data.userId,
			data.groupId,
			data.firstName,
			data.lastName || null,
			data.isText ? 1 : 0,
			data.wordCount || 0,
			data.isSticker ? 1 : 0,
			data.isMedia ? 1 : 0,
			now,
			now,
		);
	}
}

export function getGroups(adminId: number): { id: number; title: string }[] {
	// This is a placeholder. In a real scenario, you'd probably
	// want to store group titles in the database as well when the bot joins them.
	// For now, it just returns distinct group IDs.
	const query = db.query<{ id: number }, []>(`
        SELECT DISTINCT group_id as id FROM user_stats
    `);
	return query.all().map((row) => ({ id: row.id, title: `Group ${row.id}` }));
}
