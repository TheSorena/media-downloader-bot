FROM node:22-slim

# Install system dependencies for Playwright + general tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    ffmpeg \
    ca-certificates \
    curl \
    git \
    wget \
    # Playwright/Chromium dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libwayland-client0 \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir yt-dlp curl_cffi

ENV PATH="/opt/venv/bin:$PATH"

# Install pnpm and clone cobalt
RUN npm install -g pnpm
RUN git clone https://github.com/imputnet/cobalt.git /cobalt

# Install cobalt dependencies
WORKDIR /cobalt/api
RUN pnpm install

# Setup bot
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Install Playwright browsers
RUN npx playwright install chromium

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

RUN rm -rf node_modules && npm ci --omit=dev && npm cache clean --force

# Reinstall playwright for runtime (needed after npm ci --omit=dev)
RUN npm install playwright

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN mkdir -p /tmp/downloads /app/cookies

ENV NODE_ENV=production
ENV API_URL=http://localhost:9000/
ENV API_PORT=9000

EXPOSE 9000

CMD ["/entrypoint.sh"]
