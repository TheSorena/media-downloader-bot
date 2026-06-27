FROM node:22-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    ffmpeg \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir yt-dlp

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

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

RUN rm -rf node_modules && npm ci --omit=dev && npm cache clean --force

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN mkdir -p /tmp/downloads

ENV NODE_ENV=production
ENV API_URL=http://localhost:9000/
ENV API_PORT=9000

EXPOSE 9000

CMD ["/entrypoint.sh"]
