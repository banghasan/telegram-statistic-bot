import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { api } from "./routes/api";

const app = new Hono();

// API Routes
import { runtimeState } from "../config";

const publicApi = new Hono();
publicApi.get("/info", (c) => {
  return c.json({ botUsername: runtimeState.botUsername });
});

app.route("/public", publicApi);
app.route("/api", api);

// Health check endpoint
app.get("/health", (c) => c.text("OK", 200));

// Static files
// In a production environment with Vite, this would be handled differently,
// but for the raw simple setup we serve specific files.
app.get("/*", serveStatic({ root: "./src/webapp" }));

// Fallback to index.html for SPA routing if needed (though hash routing is used)
app.get("/", serveStatic({ path: "./src/webapp/index.html" }));
app.get("/style.css", serveStatic({ path: "src/webapp/style.css" }));
app.get("/script.js", serveStatic({ path: "src/webapp/script.js" }));

export default app;
