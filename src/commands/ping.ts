import type { Bot, Context } from "gramio";

export function loadPingCommand(bot: Bot) {
  bot.command("ping", async (context: Context) => {
    const startTime = performance.now();
    const msg = await context.reply("Pong!");
    const endTime = performance.now();
    const responseTime = (endTime - startTime).toFixed(2);

    await msg.editText(`Pong!\n<code>${responseTime}</code> ms`, {
      parse_mode: "HTML",
    });
  });
}
