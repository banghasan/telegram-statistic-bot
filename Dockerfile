# Build stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application as a standalone executable
RUN bun build --compile --minify --sourcemap src/bot.ts --outfile server

# Production stage
FROM gcr.io/distroless/cc-debian12

WORKDIR /app

# Copy the executable from builder
COPY --from=builder /app/server /app/server

# Copy static assets for Web App
COPY --from=builder /app/src/webapp /app/src/webapp

# Expose the application port
EXPOSE 3000

# Set the entrypoint
ENTRYPOINT ["/app/server"]
