import type { Bot, Context } from "gramio";

export function loadStartCommand(bot: Bot) {
  bot.command("start", (context: Context) => {
    return context.reply(
      "Welcome! I'm a statistics bot. Add me to a group, and I'll start tracking user activity. Use /stats to view the stats web app!"
    );
  });
}
