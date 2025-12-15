import type { Bot } from "gramio";
import { loadMessageTracker } from "./message";
import { loadPingCommand } from "./ping";
import { loadStartCommand } from "./start";
import { loadStatsCommand } from "./stats";
import { loadWebCommand } from "./web";

export function loadCommands(bot: Bot) {
  loadMessageTracker(bot); // Load middleware/tracker first
  loadStartCommand(bot);
  loadPingCommand(bot);
  loadStatsCommand(bot);
  loadWebCommand(bot);
}
