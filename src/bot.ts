import { Bot, Context } from "gramio";
import { InlineKeyboard } from "@gramio/keyboards";
import { resolve } from "path";
import crypto from "crypto";

import config from "./config";
import {
  getGroupTopUsers,
  getGroups,
  getUserStat,
  upsertUserStat,
} from "./database";

const bot = new Bot(config.bot.token);

// A middleware to verify the initData from Telegram
const verifyTelegramWebAppData = async (req: Request) => {
  const header = req.headers.get("Telegram-Data");
  if (!header) {
    return new Response(
      JSON.stringify({ error: "Not a Telegram Web App request" }),
      { status: 401 },
    );
  }

  const urlParams = new URLSearchParams(header);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");
  urlParams.sort();

  const dataCheckString = Array.from(urlParams.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(config.bot.token)
    .digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== hash) {
    return new Response(JSON.stringify({ error: "Invalid hash" }), {
      status: 403,
    });
  }

  // Attach user data to the request for later use
  (req as any).user = JSON.parse(urlParams.get("user") || "{}");
  return null; // Indicates success
};

// --- BOT LOGIC ---
// Middleware to track user stats
bot.on("message", async (context, next) => {
  const { from, chat, text, sticker, photo, video, document, audio } = context;
  if (chat.type === "private" || !from) return next();

  const isText = !!text;
  const isSticker = !!sticker;
  const isMedia = !!photo || !!video || !!document || !!audio;
  if (!isText && !isSticker && !isMedia) return next();

  upsertUserStat({
    userId: from.id,
    groupId: chat.id,
    firstName: from.firstName,
    lastName: from.lastName,
    isText,
    isSticker,
    isMedia,
    wordCount: isText ? text.split(/\s+/).length : 0,
  });

  return next();
});
bot.command("start", (context) =>
  context.reply(
    "Welcome! I am a statistics bot. Add me to a group, and I will start tracking user activity. Use /stats to see your stats!",
  ),
);

bot.command("ping", async (context) => {
  const startTime = performance.now();
  const msg = await context.reply("Pong!");
  const endTime = performance.now();
  const responseTime = (endTime - startTime).toFixed(2);

  await msg.editText(`Pong!\n${responseTime}ms`);
});

function formatDate(dateString: string, timeZone: string): string {
  const date = new Date(dateString);
  const formatter = new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
    timeZoneName: "short",
  });

  return formatter.format(date);
}

bot.command("stats", async (context) => {
  const { from, chat } = context;
  if (chat.type === "private" || !from) {
    return context.reply("This command only works in groups!");
  }

  const stats = getUserStat(from.id, chat.id);
  if (!stats) {
    return context.reply(
      "No stats found for you in this group yet. Send some messages first!",
    );
  }

  const message = [
    `📊 *Your Stats in ${chat.title}*`,
    "",
    `💬 *Messages*: ${stats.message_count}`,
    `✍️ *Words*: ${stats.word_count}`,
    `📈 *Avg. Words/Msg*: ${stats.average_words}`,
    `🎨 *Stickers*: ${stats.sticker_count}`,
    `🖼️ *Media*: ${stats.media_count}`,
    "",
    `_Last activity: ${formatDate(stats.updatedAt, config.timezone)}_`,
  ].join("\n");

  const replyOptions: {
    parse_mode: "Markdown";
    reply_markup?: InlineKeyboard;
  } = {
    parse_mode: "Markdown",
  };

  // const isWebAppConfigured =
  // 	config.webapp?.url && config.webapp.url !== "YOUR_WEB_APP_URL";

  // if (isWebAppConfigured) {
  // 	replyOptions.reply_markup = new InlineKeyboard().add({
  // 		text: "📊 View Group Stats",
  // 		web_app: { url: config.webapp.url },
  // 	});
  // }

  await bot.api.sendMessage({
    chat_id: context.chat.id,
    text: message,
    ...replyOptions,
  });
});

// --- WEB SERVER LOGIC ---
async function webAppHandler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Serve static files
  if (pathname === "/")
    return new Response(
      Bun.file(resolve(import.meta.dir, "webapp/index.html")),
    );
  if (pathname === "/style.css")
    return new Response(Bun.file(resolve(import.meta.dir, "webapp/style.css")));
  if (pathname === "/script.js")
    return new Response(Bun.file(resolve(import.meta.dir, "webapp/script.js")));

  // API: Get group stats
  const statsMatch = pathname.match(/^\/api\/stats\/(-?\d+)$/);
  if (statsMatch) {
    const verification = await verifyTelegramWebAppData(req);
    if (verification) return verification;

    const groupId = Number(statsMatch[1]);
    const stats = getGroupTopUsers(groupId, 10);
    let groupTitle = `Group ${groupId}`;
    try {
      const chat = await bot.api.getChat({ chat_id: groupId });
      if ("title" in chat) groupTitle = chat.title;
    } catch (e) {
      console.warn(`Could not fetch title for group ${groupId}:`, e.message);
    }

    return new Response(JSON.stringify({ stats, groupTitle }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // API: Get groups for admins
  if (pathname === "/api/admin/groups") {
    const verification = await verifyTelegramWebAppData(req);
    if (verification) return verification;

    const userId = (req as any).user?.id;
    if (!userId)
      return new Response(JSON.stringify({ error: "User not identified" }), {
        status: 401,
      });

    const isAdmin = config.admins.includes(userId) || config.owner === userId;
    if (!isAdmin)
      return new Response(JSON.stringify({ groups: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const groups = getGroups(userId);
    return new Response(JSON.stringify({ groups }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not Found", { status: 404 });
}

// --- STARTUP ---
async function start() {
  const botInfo = await bot.api.getMe();
  console.log(`Starting bot @${botInfo.username}...`);

  const { host, port } = config.server;

  try {
    if (config.bot.mode === "webhook") {
      const webhookUrl = new URL(config.bot.webhook.url);
      console.log(`Starting in webhook mode...`);

      Bun.serve({
        hostname: host,
        port,
        async fetch(req) {
          const url = new URL(req.url);
          if (url.pathname === webhookUrl.pathname) {
            return bot.webhookCallback(req, "std/http");
          }
          return webAppHandler(req);
        },
      });

      await bot.api.setWebhook({ url: config.bot.webhook.url });
      console.log(
        `Server listening on http://${host}:${port}. Webhook set to ${config.bot.webhook.url}`,
      );
    } else {
      // Polling mode
      console.log(`Starting in polling mode...`);
      await bot.api.deleteWebhook({ drop_pending_updates: true });

      Bun.serve({
        hostname: host,
        port,
        fetch: webAppHandler,
      });

      bot.start(); // Start polling
      console.log(
        `Web server for Mini App listening on http://${host}:${port}`,
      );
    }
  } catch (error) {
    console.error("Failed to start the bot or server:", error);
  }
}

start();
