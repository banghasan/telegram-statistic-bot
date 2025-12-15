import {
  getAggregatedUserStat,
  getGroupTopUsers,
  getTopUsers,
  getTotalUsersCount,
  getUserStat,
  type UserStat,
  upsertUserStat,
} from "../database";

export const statsService = {
  getAggregatedUserStat,
  getUserStat,
  upsertUserStat,
  getTopUsers,
  getTotalUsersCount,
  getGroupTopUsers,

  /**
   * Format user stats for display in a message
   */
  formatStatsMessage(
    userStats: UserStat,
    user: { firstName: string; lastName?: string }
  ): string {
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
