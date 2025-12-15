import crypto from "node:crypto";
import { resolve } from "node:path";
import { InlineKeyboard } from "@gramio/keyboards";
import { Bot, type Context } from "gramio";

import config from "./config";
import {
  getAggregatedUserStat,
  getTopUsers,
  getTotalUsersCount,
  initializeDatabase,
  isUserBanned,
  upsertUserProfile,
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

interface TelegramWebAppRequest extends Request {
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    allows_write_to_pm?: boolean;
  };
}

// A middleware to verify the initData from Telegram
const verifyTelegramWebAppData = async (req: Request) => {
  const header = req.headers.get("Telegram-Data");
  if (!header) {
    return new Response(
      JSON.stringify({ error: "Not a Telegram Web App request" }),
      { status: 401 }
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
  (req as TelegramWebAppRequest).user = JSON.parse(
    urlParams.get("user") || "{}"
  );
  return null; // Indicates success
};

// --- BOT LOGIC ---
// Middleware to track user stats
bot.on("message", async (context, next) => {
  const { from, chat, text, sticker, photo, video, document, audio } = context;
  // Only track in groups and supergroups, and only if a user is present
  if (chat.type === "private" || !from) return next();

  // Check if user is banned and kick them from the group if they are
  const isBanned = await isUserBanned(from.id);
  if (isBanned) {
    try {
      await context.kickChatMember({ user_id: from.id });
      await context.reply(
        "❌ You have been removed from this group because your account has been banned."
      );
    } catch (kickError) {
      console.error(
        `Failed to kick banned user ${from.id} from group ${chat.id}:`,
        kickError
      );
    }
    return next();
  }

  const isText = !!text;
  const isSticker = !!sticker;
  // Simplified media check
  const isMedia = !!(photo || video || document || audio);

  // Don't track if it's not a message type we are interested in
  if (!isText && !isSticker && !isMedia) return next();

  // In `gramio`, `chat.username` is available for public groups/channels
  const groupUsername = "username" in chat ? chat.username : undefined;

  await upsertUserStat({
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

  // Update user profile as well
  await upsertUserProfile(
    from.id,
    from.username,
    from.firstName,
    from.lastName,
    isBanned
  );

  return next();
});

bot.command("start", (context) => {
  return context.reply(
    "Welcome! I'm a statistics bot. Add me to a group, and I'll start tracking user activity. Use /stats to view the stats web app!"
  );
});

bot.command("ping", async (context) => {
  const startTime = performance.now();
  const msg = await context.reply("Pong!");
  const endTime = performance.now();
  const responseTime = (endTime - startTime).toFixed(2);

  await msg.editText(`Pong!\n<code>${responseTime}</code> ms`, {
    parse_mode: "HTML",
  });
});

function _formatDate(dateString: string, timeZone: string): string {
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
    // Show user statistics and add button to open web app
    const userStats = await getAggregatedUserStat(from.id);

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
      const message =
        `📊 *Your Statistics*\n\n` +
        `👤 Name: ${from.first_name}${from.last_name ? ` ${from.last_name}` : ""}\n` +
        `💬 Messages: ${userStats.message_count || 0}\n` +
        `📝 Words: ${userStats.word_count || 0}\n` +
        `📈 Avg. words/msg: ${userStats.average_words || 0}\n` +
        `🖼️ Media: ${userStats.media_count || 0}\n` +
        `😊 Stickers: ${userStats.sticker_count || 0}`;

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
    const userStats = await getAggregatedUserStat(from.id);

    if (!userStats) {
      return context.reply(
        `📊 *Your Statistics*\n\nNo activity recorded yet. Start chatting to see your stats here!`,
        { parse_mode: "Markdown" }
      );
    }

    const message =
      `📊 *Your Statistics*\n\n` +
      `👤 Name: ${from.first_name}${from.last_name ? ` ${from.last_name}` : ""}\n` +
      `💬 Messages: ${userStats.message_count || 0}\n` +
      `📝 Words: ${userStats.word_count || 0}\n` +
      `📈 Avg. words/msg: ${userStats.average_words || 0}\n` +
      `🖼️ Media: ${userStats.media_count || 0}\n` +
      `😊 Stickers: ${userStats.sticker_count || 0}`;

    await context.reply(message, { parse_mode: "Markdown" });
  }
};

bot.command("stats", statsCommandHandler);

// New /web command for private chat only
bot.command("web", async (context: Context) => {
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

// --- WEB SERVER LOGIC ---
async function webAppHandler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname, searchParams } = url;

  // Serve static files for the web app
  if (pathname === "/") {
    return new Response(
      Bun.file(resolve(import.meta.dir, "webapp/index.html"))
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

    const user = (req as TelegramWebAppRequest).user;
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "User not identified" }), {
        status: 401,
      });
    }

    const stats = await getAggregatedUserStat(user.id);
    const isAdmin = config.admins.includes(user.id) || config.owner === user.id;

    return new Response(JSON.stringify({ stats, isAdmin }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // API: Get top 100 users for admins with pagination
  if (pathname === "/api/top-users") {
    const verification = await verifyTelegramWebAppData(req);
    if (verification) return verification;

    const user = (req as TelegramWebAppRequest).user;
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

    const users = await getTopUsers({ limit, offset });
    const totalUsersResult = await getTotalUsersCount();
    const totalUsers = totalUsersResult.count;
    const totalPages = Math.ceil(totalUsers / limit);

    return new Response(
      JSON.stringify({ users, totalPages, currentPage: page }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response("Not Found", { status: 404 });
}

// --- STARTUP ---
async function start() {
  // Initialize database
  initializeDatabase(config.database);

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
        `Server listening on http://${host}:${port}. Webhook set to ${config.bot.webhook.url}`
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
        `Web server for Mini App listening on http://${host}:${port}`
      );
    }
  } catch (error) {
    console.error("Failed to start the bot or server:", error);
  }
}

start();
