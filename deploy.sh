#!/usr/bin/env bash
# ==============================================================================
# 🍵 TEAstream — 1-Click Automated Cloud VPS Installer
# Supported OS: Ubuntu 20.04+, Debian 11+
# ==============================================================================

set -e

echo ""
echo "=============================================================="
echo "  🍵 Starting TEAstream Cloud Multistream Setup..."
echo "=============================================================="
echo ""

# Ensure running as root
if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run as root: sudo bash deploy.sh"
  exit 1
fi

# Detect Server Public IP
PUBLIC_IP=$(curl -s -4 https://ifconfig.me || curl -s -4 https://api.ipify.org || echo "YOUR-SERVER-IP")

echo "[+] Updating system packages..."
apt-get update -y > /dev/null

# Install Docker if missing
if ! command -v docker &> /dev/null; then
  echo "[+] Docker not found. Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh > /dev/null
  rm get-docker.sh
  systemctl enable docker
  systemctl start docker
  echo "[✓] Docker installed successfully."
fi

# Install Docker Compose plugin if missing
if ! docker compose version &> /dev/null; then
  echo "[+] Installing Docker Compose plugin..."
  apt-get install -y docker-compose-plugin > /dev/null
  echo "[✓] Docker Compose installed."
fi

# Configure UFW Firewall if active
if command -v ufw &> /dev/null; then
  if ufw status | grep -q "Status: active"; then
    echo "[+] Opening streaming ports in UFW firewall (1935, 3000, 8000)..."
    ufw allow 1935/tcp comment 'TEAstream RTMP Ingest' > /dev/null
    ufw allow 3000/tcp comment 'TEAstream Web Dashboard' > /dev/null
    ufw allow 8000/tcp comment 'TEAstream HTTP-FLV Preview' > /dev/null
    ufw reload > /dev/null
  fi
fi

# Build and start container
echo "[+] Building and launching TEAstream container..."
docker compose down 2>/dev/null || true
docker compose up -d --build

echo ""
echo "=============================================================="
echo "  🎉 TEAstream is LIVE on your Cloud Server!"
echo "=============================================================="
echo ""
echo "  🌐 Web Dashboard: http://${PUBLIC_IP}:3000"
echo "  📡 RTMP Server:   rtmp://${PUBLIC_IP}:1935/live"
echo ""
echo "  Next Steps:"
echo "  1. Open http://${PUBLIC_IP}:3000 in your browser or phone."
echo "  2. Copy your Master Ingest Key from the dashboard."
echo "  3. Enter your stream keys for YouTube, Kick, Twitch, etc."
echo "  4. In OBS Studio on your laptop:"
echo "     • Service: Custom..."
echo "     • Server: rtmp://${PUBLIC_IP}:1935/live"
echo "     • Key: [Your Master Key]"
echo "  5. Hit 'Start Streaming' in OBS!"
echo "=============================================================="
echo ""
