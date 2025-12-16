import fs from "node:fs";
import yaml from "js-yaml";
import { merge } from "lodash";
import { z } from "zod";

// --- Zod Schemas ---

const BotConfigSchema = z
  .object({
    token: z.string().min(1, "Bot token is required"),
    mode: z.enum(["polling", "webhook"]),
    webhook: z
      .object({
        url: z.string().url(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.mode === "webhook" && !data.webhook?.url) {
        return false;
      }
      return true;
    },
    {
      message: "Webhook URL is required when mode is 'webhook'",
      path: ["webhook", "url"],
    }
  );

const DatabaseConfigSchema = z.object({
  host: z.string().default("localhost"),
  port: z.number().default(3306),
  username: z.string().default("root"),
  password: z.string().default(""),
  database: z.string().default("telegram_stats"),
});

const WebAppConfigSchema = z.object({
  url: z.string().url(),
});

const ServerConfigSchema = z.object({
  host: z.string().default("localhost"),
  port: z.number().default(8101),
});

const ConfigSchema = z.object({
  timezone: z.string().default("Asia/Jakarta"),
  bot: BotConfigSchema,
  webapp: WebAppConfigSchema,
  server: ServerConfigSchema,
  database: DatabaseConfigSchema,
  owner: z.number(),
  admins: z.array(z.number()),
});

// --- Types inferred from Zod ---

export type Config = z.infer<typeof ConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// --- Loading & Validation ---

let loadedConfig: unknown;

try {
  const configFile = fs.readFileSync("config.yml", "utf8");
  loadedConfig = yaml.load(configFile);
} catch (_e) {
  console.error("Error reading or parsing config.yml file.");
  console.error(
    "Please make sure 'config.yml' exists and is a valid YAML file."
  );
  console.error("You can copy 'config.example.yml' to get started.");
  process.exit(1);
}

const defaultConfig = {
  timezone: "Asia/Jakarta",
  database: {
    host: "localhost",
    port: 3306,
  },
  server: {
    host: "localhost",
    port: 8101,
  },
};

const mergedConfig = merge(defaultConfig, loadedConfig);

const result = ConfigSchema.safeParse(mergedConfig);

if (!result.success) {
  console.error("❌ Invalid configuration in config.yml:");
  console.error(result.error.format());
  process.exit(1);
}

const config = result.data;

export default config;
