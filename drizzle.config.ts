import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import yaml from "js-yaml";

const configFile = fs.readFileSync("config.yml", "utf8");
const config = yaml.load(configFile) as any;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: config.database.host,
    user: config.database.username,
    password: config.database.password,
    database: config.database.database,
    port: config.database.port,
  },
});
