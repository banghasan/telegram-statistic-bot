# ==========================================
# STAGE 1: Build (Kompilasi ke Binari)
# ==========================================
FROM oven/bun:1.3-alpine AS builder
WORKDIR /app

# Salin manifest dan install dependencies
# Gunakan wildcard agar fleksibel dengan bun.lock atau bun.lockb
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Salin seluruh source code
COPY . .

# Kompilasi ke binary tunggal
# --minify: memperkecil ukuran binari
# --bytecode: mempercepat startup
RUN bun build ./src/bot.ts --compile --minify --bytecode --outfile bot-app

# ==========================================
# STAGE 2: Runtime (Image Terkecil)
# ==========================================
FROM alpine:3.19
WORKDIR /app

# Install library esensial yang dibutuhkan binary Bun di Alpine
# wget sudah termasuk di dalam paket dasar Alpine
RUN apk add --no-cache libstdc++ libgcc tzdata

# Salin file binary dari stage builder
COPY --from=builder /app/bot-app .

# (Opsional) Set timezone ke Jakarta agar log bot akurat
ENV TZ=Asia/Jakarta

# Gunakan user non-root demi keamanan
RUN adduser -D botuser
USER botuser

# Port yang diexpose (sesuaikan dengan port bot Anda)
EXPOSE 8101

# Healthcheck menggunakan wget
# --spider: hanya cek koneksi tanpa download file
# -q: mode quiet (diam)
# -O -: output ke stdout
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8101/health || exit 1

# Jalankan aplikasi
ENTRYPOINT ["./bot-app"]
