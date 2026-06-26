FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    ffmpeg \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir yt-dlp

ENV PATH="/opt/venv/bin:$PATH"
ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev || npm install --omit=dev

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

RUN mkdir -p /tmp/downloads

EXPOSE 3000

CMD ["node", "dist/index.js"]
