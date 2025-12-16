import { migrate } from "drizzle-orm/mysql2/migrator";
// import { initializeDatabase, getDb } from "./db";
import config from "./config";
import { logger } from "./logger";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./db/schema";
import path from "path";

async function runMigrations() {
  logger.info("Starting database migration...");

  // Create connection specifically for migration (need to ensure DB exists? Drizzle migrator handles tables)
  // We assume DB exists as per config
  
  const connection = await mysql.createConnection({
    host: config.database.host,
    port: config.database.port,
    user: config.database.username,
    password: config.database.password,
    database: config.database.database,
    multipleStatements: true, 
  });

  const db = drizzle(connection, { schema, mode: "default" });

  try {
    // Look for migrations folder relative to the executable or current working directory
    const migrationsFolder = path.resolve(process.cwd(), "drizzle");
    logger.info(`Reading migrations from: ${migrationsFolder}`);

    await migrate(db, { migrationsFolder });
    logger.info("✅ Database migration completed successfully!");
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "❌ Database migration failed!");
    await connection.end();
    process.exit(1);
  }
}

runMigrations();
