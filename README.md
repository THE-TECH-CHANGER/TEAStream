# 🍵 TEAstream — Personal Cloud & Desktop Multistream Relay Hub

<div align="center">

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-20.x%20LTS-green.svg?style=for-the-badge&logo=node.js)
![FFmpeg](https://img.shields.io/badge/FFmpeg-Zero--CPU%20Passthrough-red.svg?style=for-the-badge&logo=ffmpeg)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Web-purple.svg?style=for-the-badge)
![Flutter](https://img.shields.io/badge/Flutter-Companion%20App-02569B.svg?style=for-the-badge&logo=flutter)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=for-the-badge&logo=docker)

**Self-hosted, ultra-low latency multi-platform RTMP/RTMPS relay engine.**  
Broadcast simultaneously to **9+ platforms** (YouTube, Twitch, Kick, Loco, Rooter, Nimo TV, Steam TV, Rumble, X Live + Custom RTMP) from a single 8 Mbps OBS stream with **0% local gaming lag**.

**Available as a native standalone Desktop App on Windows, macOS, and Linux — or as a Web Dashboard for servers, Docker, and mobile browsers!**

[Features](#-key-features) • [Architecture](#-architecture) • [Downloads](#-downloads--releases) • [Complete User Guide](#-complete-user-guide--instructions) • [Stopping the Hub](#-stopping-teastream--background-processes) • [Platform Setup](#-platform-by-platform-setup-guide) • [OBS Configuration](#-obs-studio-configuration-gaming-pc) • [Troubleshooting](#-troubleshooting--faq) • [License](#-license)

</div>

---

## 💡 Why TEAstream?

Normally, multistreaming forces creators into a frustrating dilemma:
1. **Expensive SaaS subscriptions** (e.g., Restream.io at \$40–\$100/month) with strict resolution caps, watermarks, and bandwidth limits.
2. **Local OBS Multi-RTMP plugins** that force your gaming PC to encode and upload 6+ separate video streams, causing severe in-game frame drops, GPU stutter, and home Wi-Fi congestion.

**TEAstream solves this:**
- Your gaming PC encodes and uploads **only ONE single 1080p60 stream (8,000 kbps)** over local Wi-Fi to a dedicated relay machine (e.g. a MacBook, a spare PC, or a $3/mo cloud VPS).
- TEAstream uses **Zero-CPU Bitstream Passthrough** (`-c:v copy -c:a copy`) to duplicate and broadcast packets simultaneously to all selected destinations with zero transcoding delay and under 2% CPU usage.

---

## 🏗️ Architecture

```text
 ┌────────────────────────┐
 │   Windows Gaming PC    │
 │       (OBS Studio)     │
 └───────────┬────────────┘
             │ Single 1080p60 Stream (~8 Mbps, NVENC)
             │ rtmp://RELAY-IP:1935/live
             ▼
 ┌────────────────────────────────────────────────────────┐
 │            TEASTREAM RELAY HUB (Desktop / Cloud)       │
 │                                                        │
 │  ┌─────────────────┐        ┌───────────────────────┐  │
 │  │ NodeMediaServer │ ─────▶ │ Zero-CPU FFmpeg Relay │  │
 │  │ (RTMP Ingestion)│        │   (-c:v/a copy FLV)   │  │
 │  └────────┬────────┘        └───────────┬───────────┘  │
 │           │                             │              │
 │           ▼ Live Preview                │              │
 │  ┌─────────────────────────────────┐    │              │
 │  │ Desktop App / Web Dashboard UI  │    │              │
 │  │ (Port 3000 / Native Window)     │    │              │
 │  └─────────────────────────────────┘    │              │
 └─────────────────────────────────────────┼──────────────┘
                                           │
         ┌───────────────────┬─────────────┴─────┬───────────────────┐
         ▼                   ▼                   ▼                   ▼
    🔴 YouTube           🟢 Kick             🟣 Twitch           💠 Loco
  (rtmp://live2)     (AWS IVS RTMPS:443)    (rtmp://app)        (AWS IVS RTMPS:443)
         ▼                   ▼                   ▼                   ▼
    🟠 Rooter            🟪 Nimo TV          🟢 Rumble           ➕ Custom RTMP
   (RTMPS / Show)     (alpush.rtmp)       (rtmp.rumble)        (Trovo / FB / etc.)
```

---

## 📦 Downloads & Releases

Get the official **v1.2** standalone packages directly from the [`releases/`](file:///Users/tixx/Documents/GitHub/cstream/releases) folder in this repository or from GitHub Releases:  
🔗 **Official Release**: [https://github.com/THE-TECH-CHANGER/TEAStream/releases/tag/v1.2](https://github.com/THE-TECH-CHANGER/TEAStream/releases/tag/v1.2)  
📁 **Repository Releases Folder**: [`releases/`](releases/)

| Platform | Package | Description |
| :--- | :--- | :--- |
| **🪟 Windows (Portable)** | **[`TEAstream-1.2.0-Portable.exe`](releases/TEAstream-1.2.0-Portable.exe)** (84 MB) | **Standalone single-file executable**. No installation required! Just double-click to run. |
| **🪟 Windows (Installer)** | **[`TEAstream-Setup-1.2.0.exe`](releases/TEAstream-Setup-1.2.0.exe)** (84 MB) | Full Windows NSIS installer with desktop shortcut and Start Menu integration. |
| **🍎 macOS (Apple Silicon)** | **[`TEAstream-1.2.0-macOS-arm64.dmg`](releases/TEAstream-1.2.0-macOS-arm64.dmg)** (95 MB) | Native macOS disk image installer (M1/M2/M3/M4). Drag and drop into `/Applications`. |
| **🍎 macOS (Portable Zip)** | **[`TEAstream-1.2.0-macOS-arm64.zip`](releases/TEAstream-1.2.0-macOS-arm64.zip)** (92 MB) | Portable zip archive containing `TEAstream.app`. |
| **🐧 Linux / Universal** | **[`TEAstream-1.2.0-portable-source.zip`](releases/TEAstream-1.2.0-portable-source.zip)** | Universal release archive with launchers (`.bat`, `.command`, `.sh`) and Flutter companion app. |

---

## 📖 Complete User Guide & Instructions

### 1. Running on Windows (Gaming PC or Secondary PC)
1. Download `TEAstream-Setup-1.2.0.exe` or `TEAstream-1.2.0-Portable.exe` (or extract `TEAstream-1.2.0-portable-source.zip`).
2. Double-click **`TEAstream-Setup-1.2.0.exe`** to install, or run **`TEAstream-1.2.0-Portable.exe`** directly.
3. Or use **`Start-TEAstream.bat`** if using source scripts.
4. TEAstream will automatically:
   - Start the RTMP relay server.
   - Open a standalone desktop app window.
5. Manage your streams in the app or via browser at `http://localhost:3000`.

### 2. Running on macOS (MacBook Relay Server)
1. Download **`TEAstream-1.2.0-macOS-arm64.dmg`** and drag **TEAstream** into your `/Applications` folder, OR double-click **`TEAstream.app`** / **`Start-TEAstream.command`**.
2. TEAstream starts with native **`caffeinate` power assertions** active, guaranteeing your MacBook and Wi-Fi will never sleep while streaming.
3. The dashboard opens automatically at `http://localhost:3000`.

### 3. Running on Linux (Desktop or Dedicated Box)
1. Extract `TEAstream-1.2.0-portable-source.zip` and make the script executable:
   ```bash
   chmod +x start-teastream.sh
   ./start-teastream.sh
   ```
2. TEAstream launches in standalone window mode (supports GNOME, KDE, and XFCE).

### 4. Running on Cloud VPS (Ubuntu / Debian / Docker)
Deploy TEAstream to a cheap $3–$4/month cloud VPS (e.g. Hetzner, DigitalOcean, Linode):
```bash
git clone https://github.com/THE-TECH-CHANGER/TEAStream.git teastream
cd teastream
chmod +x deploy.sh
sudo ./deploy.sh
```
Or run with **Docker Compose**:
```bash
docker compose up -d
```
Access the dashboard on `http://<YOUR-VPS-IP>:3000`.

---

## 📡 Platform-by-Platform Setup Guide

TEAstream comes preconfigured for 9 major platforms. You can edit the **RTMP Server URL** and **Stream Key** on every card in the dashboard:

| Platform | Default RTMP Server URL | Where to Get Your Stream Key | Notes |
| :--- | :--- | :--- | :--- |
| 🔴 **YouTube Live** | `rtmp://a.rtmp.youtube.com/live2` | [YouTube Live Studio](https://studio.youtube.com/channel/UC/livestreaming/dashboard) | Select "Default Stream Key" or create an Ultra Low Latency key. |
| 🟢 **Kick** | `rtmps://fa723fc1b171.global-contribute.live-video.net:443/app` | [Kick Creator Dashboard](https://kick.com/dashboard/settings/stream) | Uses Amazon IVS RTMPS on port `:443`. Automatic TLS 1.3 handling. |
| 🟣 **Twitch** | `rtmp://live.twitch.tv/app` | [Twitch Creator Dashboard](https://dashboard.twitch.tv/settings/stream) | Primary stream key (`live_...`). |
| 💠 **Loco** | `rtmps://a005fc16e50c.global-contribute.live-video.net:443/app` | [Loco Studio](https://studio.loco.gg) | AWS IVS endpoint. Stream key starts with `sk_...`. |
| 🟠 **Rooter** | `rtmps://rtmp-mumbai-in.rooter.io:443/show` | [Rooter Creator Portal](https://creator.rooter.gg) | Rooter uses **dynamic session keys**. Start a stream on Rooter, paste the fresh key, and hit Save. |
| 🟪 **Nimo TV** | `rtmp://alpush.rtmp.nimo.tv/live` | [Nimo TV Creator](https://creator.nimo.tv) | Paste your full stream key token into the card. |
| 🟢 **Rumble** | `rtmp://rtmp.rumble.com/live` | [Rumble Live Stream Setup](https://rumble.com/live-stream-setup) | Create a live stream on Rumble and copy the Stream Key. |
| 🔵 **Steam TV** | `rtmp://broadcast.steamcontent.com/broadcast` | [Steam Broadcast](https://steamcommunity.com/broadcast/upload) | Enable broadcasting in Steam Settings. |
| ⚪ **X (Twitter)** | `rtmp://va.pscp.tv:80/x` | [X Media Studio Producer](https://studio.twitter.com/producer) | Create a broadcast source. |
| ➕ **Custom RTMP** | *Any valid `rtmp://` or `rtmps://` URL* | Click **`+ Add Custom RTMP`** in Dashboard | Supports Trovo, Facebook Live, Restream, custom CDNs. |

> **Tip**: If you ever customize a preset URL and want to restore the official default, click the **Reset** button on the card!

---

## 🖥️ OBS Studio Configuration (Gaming PC)

Set up OBS Studio on your gaming machine in under 60 seconds:

1. Open **OBS Studio** on your Windows gaming PC.
2. Go to **Settings > Stream**:
   - **Service**: Set to `Custom...`
   - **Server**: Set to `rtmp://<RELAY-MACHINE-IP>:1935/live` (e.g. `rtmp://192.168.1.5:1935/live` or your VPS IP)
   - **Stream Key**: Paste your **Master Ingest Key** from the TEAstream dashboard (e.g. `cstream_live_...`)
3. Go to **Settings > Output**:
   - **Output Mode**: `Advanced`
   - **Encoder**: `NVIDIA NVENC H.264` (or `AMD HW H.264`)
   - **Rate Control**: `CBR`
   - **Bitrate**: `6,000–8,000 kbps`
   - **Keyframe Interval**: `2s`
   - **Preset**: `P5: Slow (Good Quality)` or `P4: Medium`
   - **Tuning**: `Low Latency` or `High Quality`
4. Go to **Settings > Video**:
   - **Base (Canvas) Resolution**: `1920x1080`
   - **Output (Scaled) Resolution**: `1920x1080`
   - **Common FPS Values**: `60`
5. Click **Apply** and hit **Start Streaming**!
6. TEAstream will instantly detect your broadcast, light up the **LIVE indicator**, and begin relaying to all enabled platforms simultaneously.

---

## 📱 Mobile Companion App (Flutter)

Control your multistream from your phone or tablet while gaming full-screen!
The repository includes a complete Flutter application in [`teastream_flutter/`](file:///Users/tixx/Documents/GitHub/cstream/teastream_flutter):

```bash
cd teastream_flutter
flutter pub get

# Run on your connected phone or simulator:
flutter run

# Build Android APK:
flutter build apk --release

# Build iOS App:
flutter build ipa --release
```

---

## 🛑 Stopping TEAstream & Background Processes

When your broadcast is over, you can cleanly stop TEAstream and all background relay workers (`ffmpeg`, `caffeinate`, `node`) using any of the following methods:

### Method 1: Automatic Stop (Recommended)
In the Web Dashboard, enable **"Auto-Stop Hub when OBS stream ends"**.  
As soon as you click **"Stop Streaming"** in OBS, TEAstream will detect the stream disconnection, stop all platform relays, release power locks, and gracefully shut down the background server.

### Method 2: Web Dashboard 1-Click Button
Click the **🛑 Stop Hub** button in the top-right navigation bar of the dashboard. Confirm the prompt to immediately terminate all active relays, release sleep locks, and exit cleanly.

### Method 3: 1-Click Desktop Scripts
| OS | Closing Launcher | Action |
| :--- | :--- | :--- |
| **🍎 macOS** | **`Stop-TEAstream.command`** | Double-click the file (or shortcut on Desktop). Kills `node`, terminates all `ffmpeg` relays, releases `caffeinate` sleep locks, and frees ports 3000 & 1935. |
| **🪟 Windows** | **`Stop-TEAstream.bat`** | Double-click to terminate `node.exe` and `ffmpeg.exe` processes and free ports. |
| **🐧 Linux** | **`./stop-teastream.sh`** | Runs clean `pkill` and frees ports. |

### Method 4: Terminal Command
Run the cross-platform stop command from any terminal:
```bash
npm run stop
# or:
node server/stop.js
```

---

## 🔧 Troubleshooting & FAQ

#### 1. OBS displays "Couldn't connect to server"
* Ensure your gaming PC and relay MacBook/PC are on the same local Wi-Fi or LAN network.
* Verify your relay machine's local IP address (displayed at the top of the TEAstream dashboard).
* Check firewall: ensure TCP port `1935` (RTMP) and `3000` (Web) are not blocked.

#### 2. Streaming stops when MacBook goes to sleep
* **Plug in your MacBook charger (AC power)**. macOS allows full background execution and sleep lock (`PreventSystemSleep = 1`) when connected to power.
* TEAstream automatically runs with `caffeinate -dimsu` to keep the Wi-Fi card and system awake.

#### 3. Kick or Loco shows "Waiting" or reconnects
* Kick and Loco run on Amazon IVS (`*.global-contribute.live-video.net:443`).
* Amazon IVS enforces strict session exclusivity (only 1 active connection per key). When a stream disconnects, AWS IVS takes 5–8 seconds to close the server-side socket. TEAstream automatically handles this with an 8-second backoff and `-tls_verify 0` TLS handling.

#### 4. Rooter returns "Input/output error"
* Rooter utilizes temporary session keys. Once an old stream finishes, the key expires. Go to [creator.rooter.gg](https://creator.rooter.gg), start a new broadcast, copy the new key into the Rooter card, and click **Save**.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js v20 LTS
- **RTMP Engine**: NodeMediaServer (Node.js RTMP/HTTP-FLV)
- **Relay Supervisor**: FFmpeg (OpenSSL / TLS 1.3 zero-CPU bitstream passthrough)
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS Grid Glassmorphism
- **Realtime Telemetry**: WebSockets (`ws`)
- **Desktop Framework**: Electron (`desktop/main.js`) + Native OS Launchers
- **Mobile Framework**: Flutter (`teastream_flutter/`)
- **Containerization**: Docker & Docker Compose

---

## 🛡️ License

This project is licensed under the **MIT License** — free to use, modify, and distribute for personal or commercial streaming setups.

---

<div align="center">
  <b>Built with ❤️ for creators and gamers worldwide.</b><br>
  If you find TEAstream useful, consider giving it a ⭐ on GitHub!
</div>
