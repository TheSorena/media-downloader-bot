#!/bin/bash

# Start cobalt API in background
cd /cobalt/api
if [ -f /app/cookies/cobalt-cookies.json ]; then
  export COOKIE_PATH=/app/cookies/cobalt-cookies.json
  echo "Cobalt cookies loaded from $COOKIE_PATH"
fi
pnpm start &
COBALT_PID=$!

# Wait for cobalt to start
for i in $(seq 1 30); do
  if curl -s http://localhost:9000/ > /dev/null 2>&1; then
    echo "Cobalt is ready"
    break
  fi
  sleep 1
done

# Start the bot
cd /app
python3 bot.py &
BOT_PID=$!

# Wait for both processes
wait $COBALT_PID $BOT_PID
