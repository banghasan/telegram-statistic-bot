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
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD bun run --eval "fetch('http://localhost:8101/health').then(r => { if(r.status !== 200) throw new Error('Health check failed'); console.log('Health check passed'); }).catch(e => { console.error('Health check failed:', e); process.exit(1); })"

# Set the entrypoint
ENTRYPOINT ["bun", "run", "src/bot.ts"]
