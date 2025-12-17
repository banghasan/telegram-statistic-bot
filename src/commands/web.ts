import { InlineKeyboard } from "@gramio/keyboards";
import type { Bot } from "gramio";
import config from "../config";

function isWebAppConfigured(): boolean {
  return !!(
    config.webapp?.url &&
    typeof config.webapp.url === "string" &&
    config.webapp.url !== "YOUR_WEB_APP_URL" &&
    config.webapp.url.startsWith("http")
  );
}

export function loadWebCommand(bot: Bot) {
  bot.command("web", async (context) => {
    const { from, chat } = context;
    if (!from) return;

    // Only allow in private chat
    if (chat.type !== "private") {
      return;
    }

    if (!isWebAppConfigured()) {
      return context.reply(
        "⚠️ The web app is not configured yet. Please ask the bot administrator to set it up."
      );
    }

    const message = "🌐 Access the web app stats";
    const keyboard = new InlineKeyboard().webApp(
      "📊 Open Web App",
      config.webapp.url
    );

    await context.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  });
}
