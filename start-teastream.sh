#!/bin/bash
# ==============================================================================
# 🍵 TEAstream — Standalone Launcher for Linux
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

clear
echo "=============================================================="
echo "  🍵 TEAstream - Multistream Relay Hub (Linux)"
echo "=============================================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[-] Node.js is not installed. Please install Node.js (v18 or v20 LTS)."
    exit 1
fi

# Ensure npm dependencies exist
if [ ! -d "node_modules" ]; then
    echo "[+] First-time setup: Installing dependencies..."
    npm install
    echo ""
fi

# Check if Electron desktop app is available
if [ -f "./node_modules/.bin/electron" ]; then
    echo "[✓] Launching native TEAstream Desktop Application..."
    ./node_modules/.bin/electron desktop/main.js &
    exit 0
fi

# Check if already running
if lsof -iTCP:3000 -sTCP:LISTEN -n -P > /dev/null 2>&1; then
    echo "[✓] TEAstream is already running."
else
    echo "[+] Starting TEAstream relay server..."
    nohup node server/index.js > /dev/null 2>&1 &
    sleep 2
fi

# Launch in native app window (Chromium/Chrome app mode) or browser
if command -v google-chrome &> /dev/null; then
    google-chrome --app=http://localhost:3000 &
elif command -v chromium-browser &> /dev/null; then
    chromium-browser --app=http://localhost:3000 &
elif command -v chromium &> /dev/null; then
    chromium --app=http://localhost:3000 &
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 &
fi
