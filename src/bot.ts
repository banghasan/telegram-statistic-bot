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
  getAggregatedUserStat,
  getTopUsers,
  getTotalUsersCount,
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
  // Only track in groups and supergroups, and only if a user is present
  if (chat.type === "private" || !from) return next();

  const isText = !!text;
  const isSticker = !!sticker;
  // Simplified media check
  const isMedia = !!(photo || video || document || audio);

  // Don't track if it's not a message type we are interested in
  if (!isText && !isSticker && !isMedia) return next();

  // In `gramio`, `chat.username` is available for public groups/channels
  const groupUsername = "username" in chat ? chat.username : undefined;

  upsertUserStat({
    userId: from.id,
    groupId: chat.id,
    username: from.username,
    firstName: from.firstName,
    lastName: from.lastName,
    groupTitle: chat.title,
    groupUsername: groupUsername,
    isText,
    isSticker,
    isMedia,
    wordCount: isText ? text.split(/\s+/).length : 0,
  });

  return next();
});

bot.command("start", (context) => {
  return context.reply(
    "Welcome! I'm a statistics bot. Add me to a group, and I'll start tracking user activity. Use /stats to view the stats web app!",
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

// This command now launches the main web app
const statsCommandHandler = async (context: Context) => {
  const { from, chat } = context;
  if (!from) return;

  // Check if we're in a private chat
  if (chat.type === "private") {
    if (!isWebAppConfigured()) {
      return context.reply(
        "⚠️ The stats web app is not configured yet. Please ask the bot administrator to set it up.",
      );
    }

    const message =
      "📊 *Your Statistics Hub*\n\nOpen the web app to view your detailed statistics.";

    await context.reply(message, {
      parse_mode: "Markdown",
    });
  } else {
    // In a group chat, show the user's statistics directly
    const userStats = getAggregatedUserStat(from.id);

    if (!userStats) {
      return context.reply(
        `📊 *Your Statistics*\n\nNo activity recorded yet. Start chatting to see your stats here!`,
        { parse_mode: "Markdown" },
      );
    }

    const message =
      `📊 *Your Statistics*\n\n` +
      `👤 Name: ${from.first_name}${from.last_name ? " " + from.last_name : ""}\n` +
      `💬 Messages: ${userStats.message_count}\n` +
      `📝 Words: ${userStats.word_count}\n` +
      `📈 Avg. words/msg: ${userStats.average_words}\n` +
      `🖼️ Media: ${userStats.media_count}\n` +
      `😊 Stickers: ${userStats.sticker_count}`;

    await context.reply(message, { parse_mode: "Markdown" });
  }
};

bot.command("stats", statsCommandHandler);
bot.command("leaderboard", statsCommandHandler); // Alias /leaderboard to /stats

// --- WEB SERVER LOGIC ---
async function webAppHandler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname, searchParams } = url;

  // Serve static files for the web app
  if (pathname === "/") {
    return new Response(
      Bun.file(resolve(import.meta.dir, "webapp/index.html")),
    );
  }
  if (pathname === "/style.css") {
    return new Response(Bun.file(resolve(import.meta.dir, "webapp/style.css")));
  }
  if (pathname === "/script.js") {
    return new Response(Bun.file(resolve(import.meta.dir, "webapp/script.js")));
  }

  // API: Get aggregated stats for the current user
  if (pathname === "/api/stats") {
    const verification = await verifyTelegramWebAppData(req);
    if (verification) return verification;

    const user = (req as any).user;
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "User not identified" }), {
        status: 401,
      });
    }

    const stats = getAggregatedUserStat(user.id);
    const isAdmin = config.admins.includes(user.id) || config.owner === user.id;

    return new Response(JSON.stringify({ stats, isAdmin }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // API: Get top 100 users for admins with pagination
  if (pathname === "/api/top-users") {
    const verification = await verifyTelegramWebAppData(req);
    if (verification) return verification;

    const user = (req as any).user;
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "User not identified" }), {
        status: 401,
      });
    }

    const isAdmin = config.admins.includes(user.id) || config.owner === user.id;
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
      });
    }

    const page = Number(searchParams.get("page") || "1");
    const limit = 10;
    const offset = (page - 1) * limit;

    const users = getTopUsers({ limit, offset });
    const totalUsers = getTotalUsersCount().count;
    const totalPages = Math.ceil(totalUsers / limit);

    return new Response(
      JSON.stringify({ users, totalPages, currentPage: page }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
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
