#!/bin/bash
# ==============================================================================
# 🍵 TEAstream — Double-Click Launcher for macOS
# ==============================================================================

# Move into project root directory portably
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

# Set PATH for Node & FFmpeg across common install locations
export PATH="$HOME/.local/node/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

clear
echo "=============================================================="
echo "  🍵 TEAstream - Multistream Relay Hub (macOS)"
echo "=============================================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "[-] Node.js is not found in PATH."
  echo "    Please install Node.js (v18 or v20 LTS) from https://nodejs.org/"
  echo ""
  read -p "Press Enter to exit..."
  exit 1
fi

# Ensure npm packages exist
if [ ! -d "node_modules" ]; then
  echo "[+] First-time run: Installing dependencies..."
  npm install
  echo ""
fi

# Check if TEAstream is already running
if lsof -iTCP:3000 -sTCP:LISTEN -n -P > /dev/null 2>&1; then
  echo "=============================================================="
  echo "  🍵 TEAstream is ALREADY RUNNING on this Mac"
  echo "=============================================================="
  echo ""
  echo "  [1] Restart Server & Reconnect All Streams (Recommended)"
  echo "  [2] Open Dashboard in Browser"
  echo "  [3] Stop Server Completely"
  echo ""
  read -t 5 -p "Enter choice [1-3] (auto-restarts in 5s): " choice
  choice=${choice:-1}
  echo ""

  if [ "$choice" = "1" ]; then
    echo "[+] Restarting TEAstream..."
    pkill -f "node server/index.js" 2>/dev/null
    pkill -f "ffmpeg" 2>/dev/null
    sleep 1
  elif [ "$choice" = "2" ]; then
    open "http://localhost:3000"
    exit 0
  elif [ "$choice" = "3" ]; then
    echo "[+] Stopping TEAstream..."
    pkill -f "node server/index.js" 2>/dev/null
    pkill -f "ffmpeg" 2>/dev/null
    pkill -f "caffeinate.*server/index.js" 2>/dev/null
    pkill -f "caffeinate -dimsu" 2>/dev/null
    echo "[✓] Server stopped and sleep locks released."
    read -p "Press Enter to exit..."
    exit 0
  fi
fi

# Open Dashboard in default browser after 2 seconds
(sleep 2 && open "http://localhost:3000") &

# Start TEAstream server with sleep prevention (caffeinate)
echo "[+] Starting TEAstream server (macOS Sleep Prevention Active)..."
exec caffeinate -dimsu node server/index.js
