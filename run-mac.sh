#!/usr/bin/env bash
# ==============================================================================
# 🍵 TEAstream — Local MacBook Launcher
# ==============================================================================

# Ensure Node & FFmpeg are in PATH
export PATH="$HOME/.local/node/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# Move to script directory
cd "$(dirname "$0")"

echo "=============================================================="
echo "  🍵 Starting TEAstream on macOS..."
echo "=============================================================="

# Check if node is available
if ! command -v node &> /dev/null; then
  echo "[-] Node.js is not found in PATH."
  echo "    Please make sure Node.js is installed."
  exit 1
fi

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "[+] Installing node dependencies..."
  npm install
fi

# Open web dashboard in browser after a short delay
(sleep 2 && open "http://localhost:3000") &

# Start the server with sleep prevention
echo "[+] Starting TEAstream server (macOS Sleep Prevention Active)..."
exec caffeinate -dimsu node server/index.js

