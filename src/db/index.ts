import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import type { DatabaseConfig } from "../config";
import * as schema from "./schema";

// Types
export type MysqlDB = MySql2Database<typeof schema>;

// Global state
let mysqlDb: MysqlDB | undefined;

export async function initializeDatabase(config: DatabaseConfig) {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
  });
  mysqlDb = drizzle(connection, { schema, mode: "default" });
}

export function getDb(): MysqlDB {
  if (!mysqlDb) throw new Error("MySQL DB not initialized");
  return mysqlDb;
}
