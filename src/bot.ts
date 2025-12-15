import { Bot } from "gramio";
import { loadCommands } from "./commands";
import config from "./config";
import { initializeDatabase } from "./db";
import app from "./web";

// Initialize database
initializeDatabase(config.database);

const bot = new Bot(config.bot.token);

// Load all commands and middleware
loadCommands(bot);

import { logger } from "./logger";

// --- STARTUP ---
async function start() {
  const botInfo = await bot.api.getMe();
  logger.info(`Starting bot @${botInfo.username}...`);

  const { host, port } = config.server;

  try {
    if (config.bot.mode === "webhook") {
      const webhookUrl = new URL(config.bot.webhook.url);
      logger.info(`Starting in webhook mode...`);

      // Mount webhook handler to Hono
      app.post(webhookUrl.pathname, async (c) => {
        return bot.webhookCallback(c.req.raw, "std/http");
      });

      // Start Hono server
      Bun.serve({
        fetch: app.fetch,
        hostname: host,
        port,
      });

      await bot.api.setWebhook({ url: config.bot.webhook.url });
      logger.info(
        `Server listening on http://${host}:${port}. Webhook set to ${config.bot.webhook.url}`
      );
    } else {
      // Polling mode
      logger.info(`Starting in polling mode...`);
      await bot.api.deleteWebhook({ drop_pending_updates: true });

      // Start Hono server for Web App
      Bun.serve({
        fetch: app.fetch,
        hostname: host,
        port,
      });

      bot.start(); // Start polling
      logger.info(
        `Web server for Mini App listening on http://${host}:${port}`
      );
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to start the bot or server");
  }
}

start();
