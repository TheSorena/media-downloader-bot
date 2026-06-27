#!/bin/bash

# Start cobalt API in background
cd /cobalt/api
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
