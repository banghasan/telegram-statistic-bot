import { type Bot, InlineKeyboard } from "gramio";

export function loadStartCommand(bot: Bot) {
  bot.command("start", async (context) => {
    const me = await bot.api.getMe();
    const keyboard = new InlineKeyboard().url(
      "👥 Tambahkan ke Grup",
      `https://t.me/${me.username}?startgroup=true`
    );
    return context.reply(
      "Halo semuanya!\n\nKenalin nih, Saya adalah Bot Statistik yang bisa bantu pantau aktivitas grup. Biar botnya bisa bekerja maksimal dan kasih data yang akurat, jangan lupa tambahkan saya ke grup kita ya!\n\nSeru banget lho bisa lihat siapa yang paling rajin ngobrol di sini.\n\n- Perintah tersedia saat ini: `/stats`",
      {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      }
    );
  });
}
