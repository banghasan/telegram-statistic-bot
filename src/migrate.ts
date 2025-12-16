import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
// import { initializeDatabase, getDb } from "./db";
import config from "./config";
import * as schema from "./db/schema";

// import { logger } from "./logger";

async function runMigrations() {
  console.log("🚀 Starting database migration script...");
  console.log(
    `📡 Connecting to database at ${config.database.host}:${config.database.port}...`
  );

  try {
    // 1. Connect without database selected to ensure we can create it
    const connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      multipleStatements: true,
    });

    console.log("✅ Connected to MySQL server.");

    // 2. Create database if it doesn't exist
    const dbName = config.database.database;
    console.log(`📦 Ensuring database '${dbName}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`✅ Database '${dbName}' check passed.`);

    // 3. Switch to the database
    await connection.changeUser({ database: dbName });
    console.log(`📂 Switched to database '${dbName}'.`);

    // 4. Initialize Drizzle
    const db = drizzle(connection, { schema, mode: "default" });

    // 5. Run Migrations
    // Look for migrations folder relative to the executable or current working directory
    const migrationsFolder = path.resolve(process.cwd(), "drizzle");
    console.log(`📂 Reading migrations from: ${migrationsFolder}`);

    await migrate(db, { migrationsFolder });
    console.log("🎉 Database migration completed successfully!");

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed!", error);
    process.exit(1);
  }
}

runMigrations();
