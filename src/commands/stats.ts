import { InlineKeyboard } from "@gramio/keyboards";
import type { Bot } from "gramio";
import config from "../config";
import { statsService } from "../services/stats.service";

// Helper function to check if webapp is configured
function isWebAppConfigured(): boolean {
  return !!(
    config.webapp?.url &&
    typeof config.webapp.url === "string" &&
    config.webapp.url !== "YOUR_WEB_APP_URL" &&
    config.webapp.url.startsWith("http")
  );
}

export function loadStatsCommand(bot: Bot) {
  // biome-ignore lint/suspicious/noExplicitAny: Context type is complex
  bot.command("stats", async (context: any) => {
    const { from, chat } = context;
    if (!from) return;

    const userStats = await statsService.getUserStat(from.id);

    let message: string;
    if (!userStats) {
      message = `📊 *Your Statistics*\n\nNo activity recorded yet. Start chatting to see your stats here!`;
    } else {
      message = statsService.formatStatsMessage(userStats, {
        firstName: from.firstName,
        lastName: from.lastName,
      });
    }

    let sentMessage;
    if (isWebAppConfigured() && chat.type === "private") {
      const keyboard = new InlineKeyboard().webApp(
        "🌐 Open Web App",
        config.webapp.url,
      );
      sentMessage = await context.reply(message, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } else {
      sentMessage = await context.reply(message, { parse_mode: "Markdown" });
    }

    if (
      chat.type !== "private" &&
      config.delete_message_delay &&
      config.delete_message_delay > 0 &&
      sentMessage
    ) {
      const chatId = sentMessage.chat.id;
      const messageId = sentMessage.id;

      setTimeout(() => {
        bot.api
          .deleteMessage({
            chat_id: chatId,
            message_id: messageId,
          })
          .catch(console.error);
      }, config.delete_message_delay * 1000);
    }
  });
}
