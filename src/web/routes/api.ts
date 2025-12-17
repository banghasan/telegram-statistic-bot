import { Hono } from "hono";
import config from "../../config";
import { statsService } from "../../services/stats.service";
import { verifyTelegramWebApp } from "../middlewares/auth";

// Extend Hono context type to include user
type Variables = {
  user: { id: number };
};

const api = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes in this group
api.use("*", verifyTelegramWebApp);

api.get("/stats", async (c) => {
  const user = c.get("user") as { id: number };
  if (!user?.id) {
    return c.json({ error: "User not identified" }, 401);
  }

  const stats = await statsService.getUserStat(user.id);
  const groupsForUser = await statsService.getGroupsForUser(user.id);
  const isAdmin =
    config.admins.map(Number).includes(Number(user.id)) ||
    Number(config.owner) === Number(user.id);

  return c.json({ stats, isAdmin, groupsForUser });
});

api.get("/groups", async (c) => {
  const user = c.get("user") as { id: number };
  const isAdmin = config.admins.includes(user.id) || config.owner === user.id;
  if (!isAdmin) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const page = Number(c.req.query("page") || "1");
  const limit = 5;

  const { data, total } = await statsService.getTopGroups({ page, limit });
  const totalPages = Math.ceil(total / limit);

  return c.json({ groups: data, totalPages, currentPage: page });
});

api.get("/users", async (c) => {
  const user = c.get("user") as { id: number };
  const isAdmin = config.admins.includes(user.id) || config.owner === user.id;
  if (!isAdmin) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const page = Number(c.req.query("page") || "1");
  const limit = 5;

  const { data, total } = await statsService.getTopUsers({ page, limit });
  const totalPages = Math.ceil(total / limit);

  return c.json({ users: data, totalPages, currentPage: page });
});

export { api };
