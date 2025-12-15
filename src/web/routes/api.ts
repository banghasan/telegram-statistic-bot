import { Hono } from "hono";
import config from "../../config";
import { statsService } from "../../services/stats.service";
import { verifyTelegramWebApp } from "../middlewares/auth";

const api = new Hono();

// Apply auth middleware to all routes in this group
api.use("*", verifyTelegramWebApp);

api.get("/stats", async (c) => {
  const user = c.get("user");
  if (!user?.id) {
    return c.json({ error: "User not identified" }, 401);
  }

  const stats = await statsService.getAggregatedUserStat(user.id);
  const isAdmin = config.admins.includes(user.id) || config.owner === user.id;

  return c.json({ stats, isAdmin });
});

api.get("/top-users", async (c) => {
  const user = c.get("user");
  if (!user?.id) {
    return c.json({ error: "User not identified" }, 401);
  }

  const isAdmin = config.admins.includes(user.id) || config.owner === user.id;
  if (!isAdmin) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const page = Number(c.req.query("page") || "1");
  const limit = 10;
  const offset = (page - 1) * limit;

  const users = await statsService.getTopUsers({ limit, offset });
  const totalUsersResult = await statsService.getTotalUsersCount();
  const totalUsers = totalUsersResult.count;
  const totalPages = Math.ceil(totalUsers / limit);

  return c.json({ users, totalPages, currentPage: page });
});

export { api };
