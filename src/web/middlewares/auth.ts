import crypto from "node:crypto";
import { createMiddleware } from "hono/factory";
import config from "../../config";

export const verifyTelegramWebApp = createMiddleware(async (c, next) => {
  const header = c.req.header("Telegram-Data");
  if (!header) {
    return c.json({ error: "Not a Telegram Web App request" }, 401);
  }

  const urlParams = new URLSearchParams(header);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");
  urlParams.sort();

  const dataCheckString = Array.from(urlParams.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(config.bot.token)
    .digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== hash) {
    return c.json({ error: "Invalid hash" }, 403);
  }

  // Attach user data to the request context
  const user = JSON.parse(urlParams.get("user") || "{}");
  c.set("user", user);

  await next();
});
