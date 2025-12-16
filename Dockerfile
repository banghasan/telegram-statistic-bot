# Build stage
FROM oven/bun:latest AS builder

WORKDIR /app
ENV NODE_ENV=production

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application as a standalone executable
RUN bun build --compile --minify --sourcemap src/bot.ts --outfile server
RUN bun build --compile --minify --sourcemap src/migrate.ts --outfile migrate

# Production stage
FROM gcr.io/distroless/cc-debian12

WORKDIR /app
ENV NODE_ENV=production

# Copy the executable from builder
COPY --from=builder /app/server /app/server
COPY --from=builder /app/migrate /app/migrate

# Copy static assets for Web App
COPY --from=builder /app/src/webapp /app/src/webapp
COPY --from=builder /app/drizzle /app/drizzle

# Expose the application port
EXPOSE 3000

# Set the entrypoint
ENTRYPOINT ["/app/server"]
