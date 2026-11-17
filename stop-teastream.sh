#!/bin/bash
# ==============================================================================
# 🍵 TEAstream — Stop Command for Linux
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=============================================================="
echo "  🍵 TEAstream - Stopping Server and Background Relays (Linux)"
echo "=============================================================="
echo ""

# 1. Graceful HTTP shutdown attempt
if command -v curl &> /dev/null; then
  echo "[+] Sending graceful shutdown signal..."
  curl -s -X POST http://127.0.0.1:3000/api/server/shutdown >/dev/null 2>&1
  sleep 1
fi

# 2. Kill server and FFmpeg
echo "[+] Stopping Node.js server..."
pkill -f "node server/index.js" 2>/dev/null

echo "[+] Terminating active FFmpeg relay streams..."
pkill -f "ffmpeg" 2>/dev/null

sleep 1

# Check ports
if command -v fuser &> /dev/null; then
  fuser -k 3000/tcp 2>/dev/null
  fuser -k 1935/tcp 2>/dev/null
fi

echo ""
echo "=============================================================="
echo "  [✓] TEAstream has been COMPLETELY STOPPED."
echo "  [✓] All background relays terminated."
echo "  [✓] Ports 3000 and 1935 are free."
echo "=============================================================="
echo ""
