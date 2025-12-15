import fs from "node:fs";
import yaml from "js-yaml";
import { merge } from "lodash";

interface BotConfig {
  token: string;
  mode: "polling" | "webhook";
  webhook: {
    url: string;
  };
}

export interface DatabaseConfig {
  type: "sqlite" | "mariadb";
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  filename?: string; // For SQLite
}

interface WebAppConfig {
  url: string;
}

interface ServerConfig {
  host?: string;
  port?: number;
}

export interface Config {
  timezone: string;
  bot: BotConfig;
  webapp: WebAppConfig;
  server: ServerConfig;
  database: DatabaseConfig;
  owner: number;
  admins: number[];
}

let loadedConfig: Partial<Config>;

try {
  const configFile = fs.readFileSync("config.yml", "utf8");
  loadedConfig = yaml.load(configFile) as Config;
} catch (_e) {
  console.error("Error reading or parsing config.yml file.");
  console.error(
    "Please make sure 'config.yml' exists and is a valid YAML file."
  );
  console.error("You can copy 'config.example.yml' to get started.");
  process.exit(1);
}

const defaultConfig: Partial<Config> = {
  timezone: "Asia/Jakarta",
  database: {
    type: "sqlite",
    filename: "db/stats.sqlite",
  },
  server: {
    host: "localhost",
    port: 8101,
  },
};

const config: Config = merge(defaultConfig, loadedConfig) as unknown as Config;

if (!config.bot?.token || config.bot.token === "YOUR_BOT_TOKEN") {
  console.error("Bot token is not configured in config.yml (bot.token)");
  process.exit(1);
}

if (!config.bot.mode || !["polling", "webhook"].includes(config.bot.mode)) {
  console.error(
    "Bot mode must be set to either 'polling' or 'webhook' in config.yml (bot.mode)"
  );
  process.exit(1);
}

export default config;
