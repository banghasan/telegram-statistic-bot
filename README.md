# Telegram Group Stats Bot

A comprehensive Telegram bot that tracks user activity in groups and displays
detailed statistics through a dynamic Web App. Built with
[Bun](https://bun.sh/), [GramIO](https://gram.io/), [Hono](https://hono.dev/),
[Drizzle ORM](https://orm.drizzle.team/), and [MariaDB](https://mariadb.org/).

## Features

- **Robust Statistics Tracking**: Monitors messages, word counts, stickers, and
  media usage per user and group.
- **MariaDB Backend**: Scalable and reliable data storage using MariaDB.
- **Dynamic Web App**:
  - **User Stats**: View your personal activity statistics.
  - **Admin Dashboard**: (Admin/Owner only) View top groups and top users
    leaderboards with pagination.
  - Built with **Alpine.js** and **Tailwind-like** CSS for a responsive, modern
    UI.
- **Flexible Deployment**: Supports both `polling` and `webhook` modes.
- **Secure**: Web app data is verified using HMAC signatures from Telegram.

## Project Structure

```
.
├── src/
│   ├── bot.ts            # Main entry point (Bot + Web Server)
│   ├── config.ts         # Configuration loader (Zod)
│   ├── db/               # Database logic (Drizzle ORM)
│   │   ├── index.ts      # DB connection
│   │   └── schema.ts     # MariaDB tables (users, groups, etc.)
│   ├── services/         # Business logic
│   │   └── stats.service.ts # Core stats processing
│   ├── commands/         # Bot commands (/stats, etc.)
│   ├── web/              # Web application backend (Hono)
│   │   ├── index.ts      # Web server setup
│   │   └── routes/       # API endpoints
│   └── webapp/           # Frontend (Alpine.js)
│       ├── index.html
│       ├── style.css
│       └── script.js
├── config.yml            # Main configuration file
├── package.json
└── README.md
```

## Prerequisites

- **Bun** runtime installed.
- **MariaDB** server running and accessible.
- A **Telegram Bot Token**.

## Setup Guide

### 1. Clone & Install

```bash
git clone <repository-url>
cd <repository-directory>
bun install
```

### 2. Configure Database & Bot

Copy the example config:

```bash
cp config.example.yml config.yml
```

Edit `config.yml`:

```yaml
# General Bot Configuration
timezone: "Asia/Jakarta"

# The time in seconds to wait before deleting the /stats message in groups.
# Set to 0 to disable.
delete_message_delay: 60

# Telegram Bot Configuration
bot:
  # Your Telegram bot token from @BotFather
  token: "YOUR_BOT_TOKEN"

  # The mode to run the bot in. Can be 'polling' or 'webhook'.
  mode: "polling"

  # Settings for webhook mode
  webhook:
    # The public URL for your webhook (e.g., https://your-domain.com/bot)
    # This should point to the server host and port defined below.
    url: "https://example.com/bot"

# Mini Web App Configuration
webapp:
  # The public URL of your Mini Web App
  # This is the URL that will be opened from the /stats command
  url: "YOUR_WEB_APP_URL"

# Server configuration for the Web App and/or Webhook
server:
  host: "localhost"
  port: 8101

# Database configuration
database:
  # Connection details for MariaDB
  host: "localhost"
  port: 3306
  username: "root"
  password: "password"
  database: "telegram_stats"

# User IDs for access control
owner: 123456789
admins:
  - 987654321
  - 112233445

```

### 3. Database Migration

The bot uses Drizzle ORM. You may need to push the schema to your MariaDB
instance:

```bash
# If you have drizzle-kit configured in package.json
bun run db:push
# Or ensure the bot creates tables on startup if configured (currently handled via code or manual push)
```

_Note: The current setup assumes the database exists. Tables are defined in
`src/db/schema.ts`._

### 4. Run the Bot

```bash
bun start
# or for development
bun run dev
```

## Usage

1. **Add to Group**: Add the bot to your group and promote it to Admin
   (optional, but recommended for full access).
2. **Track Activity**: The bot automatically records activity for every message.
3. **View Stats**:
   - Send `/stats` in the group or private chat.
   - Click the **"Open Web App"** button.
   - **Regular Users**: See their own stats.
   - **Admins/Owner**: Can switch tabs to view **Top Groups** and **Top Users**
     (filtered for activity in the last 3 months).

## Development

- **Linting**: `bun lint`
- **Formatting**: `bun format`

## Docker Deployment

### Using Docker Compose

1. Ensure `docker-compose.yml` is present.
2. Ensure `config.yml` is configured.
3. Run:

```bash
docker-compose up -d
```

### Database Migration

Migrations are now bundled in the Docker image. To apply them:

```bash
docker-compose run --rm migrator
```
