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
bot:
  token: "YOUR_BOT_TOKEN_HERE"
  mode: "polling" # or "webhook"
  webhook:
    url: "https://your-domain.com/bot" # Required for webhook mode
    port: 8101

database:
  host: "localhost"
  port: 3306
  username: "root"
  password: "password"
  database: "telegram_stats"

webapp:
  url: "https://your-domain.com" # URL where the webapp is hosted

owner: 123456789 # Your Telegram User ID
admins: # List of Admin IDs
  - 987654321
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

## License

MIT
