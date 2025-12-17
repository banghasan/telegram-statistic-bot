FROM oven/bun:latest

WORKDIR /app
ENV NODE_ENV=production

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Expose the application port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["bun", "run", "src/healthcheck.ts"]

# Set the entrypoint
ENTRYPOINT ["bun", "run", "src/bot.ts"]
