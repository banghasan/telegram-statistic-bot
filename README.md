# Telegram Group Stats Bot

A Telegram bot that tracks user activity in groups and displays statistics through a Mini Web App. Built with [Bun](https://bun.sh/), [GramIO](https://gram.io/), and `bun:sqlite`.

## Features

- **User Activity Tracking**: Monitors messages, words, stickers, and media (photos, videos, etc.) sent by users in a group.
- **Dual Mode**: Can be run in either `polling` or `webhook` mode.
- **Personal Stats**: Users can get their own statistics by using the `/stats` command in a group.
- **Group Leaderboard**: The `/stats` command provides a button to a Mini Web App which displays a leaderboard of the top 10 most active users in the group.
- **Admin View**: Bot owner and admins can view statistics for any group the bot is a member of, directly from the web app.
- **Secure**: Web app data is verified using HMAC signatures to ensure requests are legitimate.

## Project Structure
```
.
├── db/
│   └── stats.sqlite      # The SQLite database file.
├── src/
│   ├── bot.ts            # Main application file: bot logic, web server, and API.
│   ├── config.ts         # Loads and validates the configuration file.
│   ├── database.ts       # Handles all database interactions (SQLite).
│   └── webapp/
│       ├── index.html    # The main page for the Mini Web App.
│       ├── style.css     # Styles for the web app.
│       └── script.js     # Client-side logic for the web app.
├── .gitignore
├── biome.json            # Biome.js (linter, formatter) configuration.
├── config.example.yml    # Example configuration file.
├── package.json
└── tsconfig.json
```

## Getting Started

Follow these steps to set up and run the bot.

### 1. Prerequisites

Make sure you have [Bun](https://bun.sh/docs/installation) installed on your machine.

### 2. Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 3. Install Dependencies

```bash
bun install
```

### 4. Configure the Bot

Create a `config.yml` file by copying the example:

```bash
cp config.example.yml config.yml
```

Now, edit `config.yml` with your own values:

- **`bot.token`**: Your Telegram bot token from [@BotFather](https://t.me/BotFather).
- **`bot.mode`**: Set to `polling` to start, or `webhook` for production.
- **`bot.webhook.url`**: If using webhook mode, the public URL for your webhook (e.g., `https://your-domain.com/bot`).
- **`bot.webhook.port`**: The port for the server to listen on (for both webhook and the web app).
- **`webapp.url`**: The public URL for your Mini Web App. This can be the same as your webhook URL, but without the `/bot` path. See the note below.
- **`owner`**: The Telegram User ID of the bot's owner.
- **`admins`**: A list of Telegram User IDs for users who should have admin privileges.

**A Note on Public URLs:**
For the Mini Web App and Webhook mode to work, Telegram needs to access the bot from a public HTTPS URL. When developing locally, the bot runs a server (e.g., on port `8080`). You will need a tool like [ngrok](https://ngrok.com/) to expose this local server to the internet.

Example using ngrok:
```bash
ngrok http 8101
```
Ngrok will give you a public `https` URL (e.g., `https://xxxx-xxxx.ngrok-free.app`). Use this for your `webapp.url` and `bot.webhook.url` in the config file.

### 5. Run the Bot

Once configured, you can start the bot:

```bash
bun start
```

The console will show that the web server and the bot have started in the configured mode.

## How It Works

1.  **Add the Bot to a Group**: Make the bot a member of your Telegram group. It will automatically start tracking messages.
2.  **Get Your Stats**: Type `/stats` in the group. The bot will reply with your personal statistics for that group.
3.  **View the Leaderboard**: In the bot's reply, click the "📊 View Group Stats" button. This will open a Mini Web App showing the top 10 users.
4.  **Admin View**: If you are listed as an `owner` or `admin` in the config, the web app will show a dropdown menu allowing you to view the stats for any group the bot is in.

## Development

This project uses [Biome.js](https://biomejs.dev/) for linting and formatting.

- **Check for issues**:
  ```bash
  bun check
  ```
- **Fix linting errors**:
  ```bash
  bun lint
  ```
- **Format the code**:
  ```bash
  bun format
  ```
