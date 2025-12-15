import { InlineKeyboard } from "@gramio/keyboards";
import type { Bot, Context } from "gramio";
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
  bot.command("stats", async (context: Context) => {
    const { from, chat } = context;
    if (!from) return;

    // Check if we're in a private chat
    if (chat.type === "private") {
      // Show user statistics and add button to open web app
      const userStats = await statsService.getAggregatedUserStat(from.id);

      if (!userStats) {
        const message = `📊 *Your Statistics*\n\nNo activity recorded yet. Start chatting to see your stats here!`;

        if (isWebAppConfigured()) {
          const keyboard = new InlineKeyboard().webApp(
            "🌐 Open Web App",
            config.webapp.url
          );
          await context.reply(message, {
            parse_mode: "Markdown",
            reply_markup: keyboard,
          });
        } else {
          await context.reply(message, {
            parse_mode: "Markdown",
          });
        }
      } else {
        const message = statsService.formatStatsMessage(userStats, {
          firstName: from.firstName,
          lastName: from.lastName,
        });

        if (isWebAppConfigured()) {
          const keyboard = new InlineKeyboard().webApp(
            "🌐 Open Web App",
            config.webapp.url
          );
          await context.reply(message, {
            parse_mode: "Markdown",
            reply_markup: keyboard,
          });
        } else {
          await context.reply(message, {
            parse_mode: "Markdown",
          });
        }
      }
    } else {
      // In a group chat, show the user's statistics directly
      const userStats = await statsService.getAggregatedUserStat(from.id);

      if (!userStats) {
        return context.reply(
          `📊 *Your Statistics*\n\nNo activity recorded yet. Start chatting to see your stats here!`,
          { parse_mode: "Markdown" }
        );
      }

      const message = statsService.formatStatsMessage(userStats, {
        firstName: from.firstName,
        lastName: from.lastName,
      });

      await context.reply(message, { parse_mode: "Markdown" });
    }
  });
}
