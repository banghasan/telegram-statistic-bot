import type { Bot } from "gramio";
import { statsService } from "../services/stats.service";
import { userService } from "../services/user.service";
import { createLogger } from "../logger";

export function loadMessageTracker(bot: Bot) {
  // Middleware to track user stats
  bot.on("message", async (context, next) => {
    const { from, chat, text, sticker, photo, video, document, audio } =
      context;
    
    // Only track in groups and supergroups, and only if a user is present
    if (chat.type === "private" || !from) return next();

    const log = createLogger({ userId: from.id, chatId: chat.id });

    // Check if user is banned and kick them from the group if they are
    const isBanned = await userService.isUserBanned(from.id);
    if (isBanned) {
      try {
        await context.kickChatMember({ user_id: from.id });
        await context.reply(
          "❌ You have been removed from this group because your account has been banned."
        );
        log.info("Kicked banned user");
      } catch (kickError) {
        log.error(
          { err: kickError },
          `Failed to kick banned user ${from.id} from group ${chat.id}`
        );
      }
      return next();
    }

    const isText = !!text;
    const isSticker = !!sticker;
    // Simplified media check
    const isMedia = !!(photo || video || document || audio);

    // Don't track if it's not a message type we are interested in
    if (!isText && !isSticker && !isMedia) return next();

    // In `gramio`, `chat.username` is available for public groups/channels
    const groupUsername = "username" in chat ? chat.username : undefined;

    await statsService.upsertUserStat({
      userId: from.id,
      groupId: chat.id,
      username: from.username,
      firstName: from.firstName,
      lastName: from.lastName,
      groupTitle: "title" in chat ? chat.title : undefined,
      groupUsername: groupUsername,
      isText,
      isSticker,
      isMedia,
      wordCount: isText ? text.split(/\s+/).length : 0,
    });

    // Update user profile as well
    await userService.upsertUserProfile(
      from.id,
      from.username,
      from.firstName,
      from.lastName,
      isBanned
    );

    return next();
  });
}
