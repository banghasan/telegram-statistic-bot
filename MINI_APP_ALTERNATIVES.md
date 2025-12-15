# Alternatif Implementasi Telegram Mini App di Grup

## Masalah

`web_app` button type hanya bekerja di **private chat**, tidak di grup. Ini
adalah limitasi Telegram API.

## Solusi & Alternatif

### ✅ Alternatif 1: Menu Button (REKOMENDASI)

**Cara paling resmi dan native untuk Mini Apps di grup.**

#### Setup via BotFather:

1. Chat dengan [@BotFather](https://t.me/BotFather)
2. Pilih bot Anda dengan `/mybots`
3. Pilih "Bot Settings" → "Menu Button"
4. Pilih "Configure Menu Button"
5. Masukkan URL Mini App: `https://your-ngrok-url.ngrok-free.app`
6. Set button text: "📊 View Stats"

#### Kelebihan:

- ✅ Native Telegram Mini App experience
- ✅ Bekerja di grup dan private chat
- ✅ Button muncul di samping input field
- ✅ Tidak perlu coding tambahan

#### Kekurangan:

- ❌ Hanya 1 button per bot
- ❌ Tidak bisa dinamis per pesan

---

### ✅ Alternatif 2: Inline Query + Switch Button

Gunakan inline query untuk membuka Mini App.

#### Implementasi:

```typescript
// Tambahkan di bot.ts
bot.on("inline_query", async (context) => {
    const results = [
        {
            type: "article",
            id: "1",
            title: "📊 View Group Leaderboard",
            description: "Open the leaderboard Mini App",
            input_message_content: {
                message_text: "Click the button below to view stats!",
            },
            reply_markup: new InlineKeyboard().url(
                "📊 Open Leaderboard",
                config.webapp.url,
            ),
        },
    ];

    await context.answerInlineQuery(results);
});
```

#### Cara Pakai:

User ketik di grup: `@YourBot stats` lalu pilih hasil

#### Kelebihan:

- ✅ Fleksibel
- ✅ Bisa digunakan di mana saja

#### Kekurangan:

- ❌ User harus tahu cara pakai inline query
- ❌ Tetap bukan native Mini App button

---

### ✅ Alternatif 3: Bot Mengirim Link ke Private Chat

Bot mengirim link ke private chat yang membuka Mini App.

#### Implementasi:

```typescript
bot.command("leaderboard", async (context) => {
    const { from, chat } = context;
    if (chat.type === "private" || !from) {
        return context.reply("This command only works in groups!");
    }

    // Send message in group
    await context.reply(
        "📊 I've sent you the leaderboard link in private chat!",
    );

    // Send Mini App button in private chat
    try {
        const keyboard = new InlineKeyboard().webApp(
            "📊 View Group Leaderboard",
            `${config.webapp.url}?group=${chat.id}`,
        );

        await bot.api.sendMessage({
            chat_id: from.id,
            text:
                `🏆 *${chat.title} Leaderboard*\n\nClick the button below to view the top users!`,
            parse_mode: "Markdown",
            reply_markup: keyboard,
        });
    } catch (error) {
        await context.reply(
            "⚠️ Please start a private chat with me first by clicking /start in DM!",
        );
    }
});
```

#### Kelebihan:

- ✅ Native Mini App experience
- ✅ Bekerja dengan web_app button

#### Kekurangan:

- ❌ User harus punya private chat dengan bot
- ❌ Extra step untuk user

---

### ✅ Alternatif 4: Deep Link ke Bot

Gunakan deep link yang membuka bot di private chat dengan Mini App.

#### Implementasi:

```typescript
bot.command("leaderboard", async (context) => {
    const { from, chat } = context;
    if (chat.type === "private" || !from) {
        return context.reply("This command only works in groups!");
    }

    // Create deep link
    const botUsername = (await bot.api.getMe()).username;
    const deepLink = `https://t.me/${botUsername}?start=leaderboard_${chat.id}`;

    const keyboard = new InlineKeyboard().url(
        "📊 Open Leaderboard",
        deepLink,
    );

    await bot.api.sendMessage({
        chat_id: context.chat.id,
        text:
            `🏆 *${chat.title} Leaderboard*\n\nClick the button to open the leaderboard in a private chat with the bot.`,
        parse_mode: "Markdown",
        reply_markup: keyboard,
    });
});

// Handle deep link
bot.command("start", async (context) => {
    const payload = context.text?.split(" ")[1];

    if (payload?.startsWith("leaderboard_")) {
        const groupId = payload.replace("leaderboard_", "");

        const keyboard = new InlineKeyboard().webApp(
            "📊 View Leaderboard",
            `${config.webapp.url}?group=${groupId}`,
        );

        return context.reply(
            "Click the button below to view the leaderboard!",
            { reply_markup: keyboard },
        );
    }

    return context.reply(
        "Welcome! I am a statistics bot. Add me to a group, and I will start tracking user activity.",
    );
});
```

#### Kelebihan:

- ✅ Native Mini App experience
- ✅ Satu klik dari grup
- ✅ Otomatis membuka private chat

#### Kekurangan:

- ❌ Redirect ke private chat (tidak langsung di grup)

---

### ❌ Alternatif 5: URL Button (Saat Ini Dipakai)

Menggunakan URL button biasa yang membuka di browser.

#### Kelebihan:

- ✅ Bekerja di grup
- ✅ Simple

#### Kekurangan:

- ❌ Bukan native Mini App
- ❌ Buka di browser/in-app browser
- ❌ Tidak ada akses ke Telegram WebApp API

---

## Rekomendasi

**Untuk pengalaman terbaik, gunakan kombinasi:**

1. **Menu Button** (via BotFather) - untuk akses cepat
2. **Alternatif 4 (Deep Link)** - untuk command `/leaderboard` yang membuka Mini
   App di private chat

Ini memberikan:

- ✅ Native Telegram Mini App experience
- ✅ Akses penuh ke Telegram WebApp API
- ✅ User-friendly
- ✅ Bekerja di grup

---

## Implementasi yang Saya Sarankan

Saya bisa implementasikan **Alternatif 4 (Deep Link)** untuk Anda. Ini akan:

1. User ketik `/leaderboard` di grup
2. Bot kirim button yang membuka private chat
3. Di private chat, bot kirim Mini App button
4. Mini App terbuka dengan data grup yang benar

Apakah Anda ingin saya implementasikan ini?
