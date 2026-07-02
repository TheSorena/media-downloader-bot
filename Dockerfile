FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    ffmpeg \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm
RUN git clone https://github.com/imputnet/cobalt.git /cobalt

WORKDIR /cobalt/api
RUN pnpm install

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --break-system-packages -r requirements.txt

COPY . .

RUN mkdir -p /tmp/downloads /app/cookies

ENV NODE_ENV=production
ENV API_URL=http://localhost:9000/
ENV API_PORT=9000
ENV BOT_MODE=polling

EXPOSE 9000

CMD ["bash", "entrypoint.sh"]
