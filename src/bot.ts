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

// Helper function to check if webapp is configured
function isWebAppConfigured(): boolean {
  return !!(
    config.webapp?.url &&
    typeof config.webapp.url === "string" &&
    config.webapp.url !== "YOUR_WEB_APP_URL" &&
    config.webapp.url.startsWith("http")
  );
}

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
bot.command("start", async (context) => {
  const payload = context.text?.split(" ")[1];

  // Handle deep link for leaderboard
  if (payload?.startsWith("leaderboard_")) {
    const groupId = Number.parseInt(payload.replace("leaderboard_", ""));

    if (!isWebAppConfigured()) {
      return context.reply(
        "⚠️ The leaderboard feature is not configured yet. Please contact the bot administrator.",
      );
    }

    // Get group title
    let groupTitle = `Group ${groupId}`;
    try {
      const chat = await bot.api.getChat({ chat_id: groupId });
      if ("title" in chat && chat.title) groupTitle = chat.title;
    } catch (e) {
      console.warn(
        `Could not fetch title for group ${groupId}:`,
        e instanceof Error ? e.message : String(e),
      );
    }

    // Send Mini App button in private chat (webApp works here!)
    const keyboard = new InlineKeyboard().webApp(
      "📊 View Group Leaderboard",
      config.webapp.url,
    );

    return context.reply(
      `🏆 *${groupTitle} Leaderboard*\n\nClick the button below to view the top 10 most active users!`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      },
    );
  }

  return context.reply(
    "Welcome! I am a statistics bot. Add me to a group, and I will start tracking user activity. Use /stats to see your stats!",
  );
});

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
    "",
    "💡 _Use /leaderboard to see the group leaderboard_",
  ].join("\n");

  await bot.api.sendMessage({
    chat_id: context.chat.id,
    text: message,
    parse_mode: "Markdown",
  });
});

bot.command("leaderboard", async (context) => {
  const { from, chat } = context;
  if (chat.type === "private" || !from) {
    return context.reply("This command only works in groups!");
  }

  if (!isWebAppConfigured()) {
    return context.reply(
      "⚠️ The leaderboard feature is not configured yet. Please ask the bot administrator to set up the webapp URL in the config file.",
    );
  }

  // Get bot username for deep link
  const botInfo = await bot.api.getMe();
  const deepLink = `https://t.me/${botInfo.username}?start=leaderboard_${chat.id}`;

  const message = [
    `🏆 *Group Leaderboard - ${chat.title}*`,
    "",
    "Click the button below to open the leaderboard Mini App!",
    "",
    "_Note: The app will open in a private chat with me for the best experience._",
  ].join("\n");

  const keyboard = new InlineKeyboard().url(
    "📊 Open Leaderboard Mini App",
    deepLink,
  );

  await bot.api.sendMessage({
    chat_id: context.chat.id,
    text: message,
    parse_mode: "Markdown",
    reply_markup: keyboard,
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
      if ("title" in chat && chat.title) groupTitle = chat.title;
    } catch (e) {
      console.warn(
        `Could not fetch title for group ${groupId}:`,
        e instanceof Error ? e.message : String(e),
      );
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
