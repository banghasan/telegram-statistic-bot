import { resolve } from "node:path";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { api } from "./routes/api";

const app = new Hono();

// API Routes
app.route("/api", api);

// Static files
// In a production environment with Vite, this would be handled differently,
// but for the raw simple setup we serve specific files.
app.get("/*", serveStatic({ root: "./src/webapp" }));

// Fallback to index.html for SPA routing if needed (though hash routing is used)
app.get("/", serveStatic({ path: "./src/webapp/index.html" }));
app.get("/style.css", serveStatic({ path: "src/webapp/style.css" }));
app.get("/script.js", serveStatic({ path: "src/webapp/script.js" }));

export default app;

