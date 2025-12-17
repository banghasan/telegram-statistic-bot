# STAGE 1: Install dependencies
FROM oven/bun:1.3-alpine AS selector
WORKDIR /app

# Hanya copy file manifest untuk memanfaatkan cache layer
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# STAGE 2: Final Runtime Image
FROM oven/bun:1.3-alpine
WORKDIR /app

# Set environment ke production
ENV NODE_ENV=production

# Hanya salin node_modules yang sudah "bersih" dari stage sebelumnya
COPY --from=selector /app/node_modules ./node_modules
COPY . .

# Expose port
EXPOSE 3000

# Healthcheck yang lebih efisien
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    # CMD bun run --eval "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
    CMD bun run --eval "fetch('http://localhost:8101/health').then(r => { if(r.status !== 200) throw new Error('Health check failed'); console.log('Health check passed'); }).catch(e => { console.error('Health check failed:', e); process.exit(1); })"

# Gunakan USER non-root untuk keamanan (User 'bun' sudah ada di image resmi)
USER bun

ENTRYPOINT ["bun", "run", "src/bot.ts"]
