import type { Bot } from "gramio";
import { statsService } from "../services/stats.service";
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
    const isBanned = await statsService.isBanned(from.id);
    if (isBanned) {
      try {
        await context.banChatMember({ user_id: from.id });
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

    // Track stats
    await statsService.processMessage(context);

    // Update user profile is handled inside processMessage
    return next();
  });
}
