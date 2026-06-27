#!/bin/bash

# Start cobalt API in background with cookies if available
cd /cobalt/api
if [ -f /app/cookies/cobalt-cookies.json ]; then
  export COOKIE_PATH=/app/cookies/cobalt-cookies.json
  echo "Cobalt cookies loaded from $COOKIE_PATH"
fi
pnpm start &
COBALT_PID=$!

# Wait for cobalt to start
sleep 5

# Start the bot
cd /app
node dist/index.js &
BOT_PID=$!

# Wait for both processes
wait $COBALT_PID $BOT_PID
