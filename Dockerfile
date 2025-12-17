# STAGE 1: Install Dependencies
FROM oven/bun:1.3-alpine AS builder
WORKDIR /app

COPY package.json bun.lock* ./
# Install semua dep, termasuk pino-pretty
RUN bun install --frozen-lockfile --production

# STAGE 2: Runtime
FROM oven/bun:1.3-alpine
WORKDIR /app

# Salin node_modules yang sudah berisi pino-pretty
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Set environment ke production
ENV NODE_ENV=production

# Gunakan user bun (lebih aman)
USER bun

EXPOSE 8101

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8101/health || exit 1

ENTRYPOINT ["bun", "run", "src/bot.ts"]
