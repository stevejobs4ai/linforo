#!/bin/bash
# Linforo server startup script
# Builds Next.js, then starts: Next.js (port 3002), HTTPS proxy (port 3003), Deepgram WS (port 3005)

set -e
cd /Users/stevejobs/linforo

# Load env vars from .env.local
if [ -f .env.local ]; then
  set -o allexport
  source .env.local
  set +o allexport
fi

echo "[linforo] Building Next.js..."
npx next build

echo "[linforo] Starting Deepgram WebSocket proxy on port 3005..."
node deepgram-ws.js &
DEEPGRAM_PID=$!

echo "[linforo] Starting HTTPS proxy on port 3003..."
node https-proxy.js &
PROXY_PID=$!

echo "[linforo] Starting Next.js on port 3002..."
npx next start -H 0.0.0.0 -p 3002

# If Next.js exits, kill background processes
kill $DEEPGRAM_PID $PROXY_PID 2>/dev/null || true
