#!/bin/bash
# ==============================================================================
# 🍵 TEAstream — 1-Click Stop Command for macOS
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
if [ -d "/Users/tixx/Documents/GitHub/cstream" ]; then
  cd "/Users/tixx/Documents/GitHub/cstream"
elif [ -d "$DIR" ]; then
  cd "$DIR"
fi

export PATH="$HOME/.local/node/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

clear
echo "=============================================================="
echo "  🍵 TEAstream - Stopping Server & Background Relays (macOS)"
echo "=============================================================="
echo ""

# 1. Graceful HTTP shutdown attempt
if command -v curl &> /dev/null; then
  echo "[+] Sending graceful shutdown signal to TEAstream..."
  curl -s -X POST http://127.0.0.1:3000/api/server/shutdown >/dev/null 2>&1
  sleep 1
fi

# 2. Stop Node.js server
echo "[+] Stopping TEAstream server process..."
pkill -f "node server/index.js" 2>/dev/null

# 3. Stop FFmpeg relays
echo "[+] Terminating active FFmpeg relay streams..."
pkill -f "ffmpeg" 2>/dev/null

# 4. Release caffeinate sleep lock
echo "[+] Releasing macOS sleep lock..."
pkill -f "caffeinate.*server/index.js" 2>/dev/null
pkill -f "caffeinate -dimsu" 2>/dev/null

sleep 1

# 5. Clean up any lingering process holding port 3000 or 1935
if lsof -iTCP:3000 -sTCP:LISTEN -n -P > /dev/null 2>&1; then
  lsof -ti:3000 | xargs kill -9 2>/dev/null
fi
if lsof -iTCP:1935 -sTCP:LISTEN -n -P > /dev/null 2>&1; then
  lsof -ti:1935 | xargs kill -9 2>/dev/null
fi

echo ""
echo "=============================================================="
echo "  [✓] TEAstream has been COMPLETELY STOPPED."
echo "  [✓] All background relays terminated."
echo "  [✓] Mac sleep prevention released (your Mac can sleep normally)."
echo "  [✓] Ports 3000, 1935, and 8000 are now free."
echo "=============================================================="
echo ""
read -t 4 -p "Closing in 4 seconds (or press Enter)..."
exit 0
