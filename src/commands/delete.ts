import type { Bot } from "gramio";
import { statsService } from "../services/stats.service";

export function loadDeleteCommand(bot: Bot) {
  bot.command("deletelast", async (ctx) => {
    if (ctx.chat.type === "private") {
      return ctx.reply("This command only works in groups.");
    }

    // This is a simulation, as bots cannot easily detect message deletions.
    // In a real scenario, this would be triggered by a deletion event if the
    // bot had permissions to see it.
    await statsService.processMessageDelete(ctx);

    return ctx.reply(
      `🗑️ Simulated a message deletion for user ${ctx.from.firstName}.`
    );
  });
}
