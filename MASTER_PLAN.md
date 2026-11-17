# CSTREAM — Cloud Multistreaming Platform
### Complete Architecture, Hosting Guide & Execution Plan

---

## 1. How It Works (The Core Concept)

When you multistream directly from OBS on your PC using plugins (like OBS Multi-RTMP), your computer must **encode and upload multiple separate video streams** at the same time. If you stream to 3 platforms at 8,000 kbps:
- **Local PC Without Cloud**: Uploads 3 × 8 = 24 Mbps, utilizes extra GPU/CPU encoding sessions, causes in-game frame drops, thermal throttling, and network jitter.
- **With CSTREAM (Cloud Relay)**: Your PC encodes **only 1 stream** and uploads **only 8 Mbps** to your personal cloud VPS. The cloud VPS duplicates the packets and forwards them to Twitch, YouTube, and Kick with **zero local PC overhead**.

```
                [ YOUR GAMING / STREAMING PC ]
                               │
                               │ Uploads 1 Single Stream (1080p 60fps @ 8,000 kbps)
                               │ Uses only 1 NVENC/AMF hardware encoder session
                               ▼
            ┌─────────────────────────────────────────┐
            │       YOUR PERSONAL CLOUD VPS           │
            │               (CSTREAM)                 │
            │                                         │
            │  1. Ingests RTMP on Port 1935           │
            │  2. Authenticates your Stream Key       │
            │  3. Web Studio Dashboard (Port 3000)    │
            │     - One-click toggles (On/Off)        │
            │     - Live Preview Player               │
            │     - Realtime Bitrate & Health Monitor │
            │                                         │
            │  4. Zero-CPU Packet Duplication:        │
            │     (-c copy bitstream passthrough)     │
            └───────┬─────────────┬─────────────┬─────┘
                    │             │             │
                    ▼             ▼             ▼
             [ TWITCH ]      [ YOUTUBE ]     [ KICK ]
             (Live RTMP)     (Live RTMP)   (Live RTMP)
```

### Why There Is ZERO CPU Lag on the Cloud
Because we are doing **pure bitstream passthrough** (`-c:v copy -c:a copy`):
- The cloud server **never decodes or re-encodes the video**.
- It acts purely as a high-speed network traffic router.
- Server CPU usage remains **under 2%**.
- Latency added is imperceptible (**~100ms – 250ms**, depending on VPS ping).

---

## 2. Cloud VPS Hosting Requirements & Cost

Because the server does not transcode, the hardware requirements are minimal. You do **not** need an expensive GPU server.

### Minimum Server Specifications
- **vCPU**: 1 Core (x86_64 or ARM64)
- **RAM**: 1 GB to 2 GB
- **Disk**: 15 GB – 25 GB SSD
- **Port Speed**: 1 Gbps or 2.5 Gbps network port
- **OS**: Ubuntu 22.04 LTS / 24.04 LTS or Debian 12

### Recommended VPS Providers

| Provider | Recommended Plan | Cost | Bandwidth Included | Data Centers |
| :--- | :--- | :--- | :--- | :--- |
| **Hetzner Cloud** *(Best Overall Value)* | **CAX11** (ARM, 2 vCPU, 4GB RAM) or **CX22** (2 vCPU, 4GB RAM) | **~€3.79 – €4.49 / month** (~$4.10) | **20 TB / month** (Practically unlimited) | Germany, Finland, US (Ashburn & Hillsboro), Singapore |
| **DigitalOcean** | Basic Droplet (1 vCPU, 1GB RAM) | **$4.00 – $6.00 / month** | **1 TB / month** | Global (US, EU, Bangalore, Singapore, etc.) |
| **Linode / Akamai** | Shared Nanode (1 vCPU, 1GB RAM) | **$5.00 / month** | **1 TB / month** | Global (US, EU, Mumbai, Tokyo, etc.) |
| **Oracle Cloud** | Always Free Ampere (ARM 4 vCPU, 24GB RAM) | **$0.00 (Free Forever)** | **10 TB / month** | Global |

> **Location Rule**: Always select a data center closest to your home city for minimum ingest ping.

### Monthly Bandwidth Math
- Streaming at **8,000 kbps (1 MB/s)** = **~3.6 GB per hour**.
- If pushing to 3 platforms (Twitch, YouTube, Kick), outgoing cloud bandwidth = 3 × 3.6 = 10.8 GB per hour.
- Streaming **4 hours/day, 30 days/month** (120 hours total):
  Total Bandwidth = 120 hours × 10.8 GB ≈ 1,300 GB (1.3 TB)
- Hetzner includes **20 TB (20,000 GB)**, leaving over 93% headroom.

---

## 3. Platform Software Architecture (What We Are Building)

```
CSTREAM/
├── server/
│   ├── index.js          # Express Web API + Static Asset Server
│   ├── rtmpServer.js     # RTMP Ingestion Server (Port 1935)
│   ├── relayManager.js   # Dynamic FFmpeg Passthrough Process Supervisor
│   ├── wsServer.js       # Real-time WebSocket Telemetry (Bitrate, FPS, Events)
│   └── storage.js        # Persistent Config Store (Keys, Active Toggles)
├── public/               # Sleek "Upstream"-style Web Dashboard
│   ├── index.html        # Glassmorphic UI with Platform Cards
│   ├── style.css         # Modern Dark Theme with Platform Accents
│   ├── app.js            # Real-time Control, Live Player & Status Indicators
│   └── assets/           # Platform logos & icons (Twitch, YouTube, Kick)
├── Dockerfile            # Container specification (Node.js + FFmpeg)
├── docker-compose.yml    # 1-command startup container
├── deploy.sh             # 1-click automated VPS installation script
└── config.example.json   # Template configuration file
```

### Core Features of Your Custom CSTREAM Studio
1. **Upstream-Style Glassmorphic Dashboard**:
   - Modern dark UI accessible via any browser (PC, phone, tablet).
   - Ingest connection modal with one-click copy buttons for Server URL and Stream Key.
2. **Platform Management Cards**:
   - **Twitch**: Toggle ON/OFF switch, ingest server selector, stream key field (masked/unmaskable), status badge (*Idle*, *Live*, *Reconnecting*).
   - **YouTube**: Toggle ON/OFF switch, RTMP stream key field, status badge.
   - **Kick**: Toggle ON/OFF switch, RTMP stream key field, status badge.
   - **Custom Destination**: Add any custom RTMP (e.g. X/Twitter, Trovo, Facebook).
3. **Live Stream Monitor & Telemetry**:
   - Embedded low-latency HTML5 live preview player.
   - Real-time dials: Ingest Bitrate (kbps), FPS, Packet Drop Rate, Uptime Timer.
   - Live FFmpeg log terminal drawer for instant debugging.
4. **Resilience & Fault Isolation**:
   - If Twitch goes down or rejects a key, **YouTube and Kick keep streaming uninterrupted**.
   - Auto-reconnect loop with exponential backoff if a destination connection blips.
   - Stream key authentication: Only your OBS stream key is permitted to broadcast.

---

## 4. End-to-End Execution Plan

1. **Step 1: Local Application Construction**:
   - Build Node.js backend with RTMP server, FFmpeg relay engine, and WebSocket broadcaster.
   - Build the Upstream-style responsive Web Dashboard.
   - Build `Dockerfile` and `docker-compose.yml`.

2. **Step 2: Cloud Server Setup (5 Minutes on Hetzner / DigitalOcean)**:
   - Create Ubuntu 24.04 instance.
   - SSH into server: `ssh root@your-vps-ip`
   - Run our automated setup script: `docker compose up -d`

3. **Step 3: Configure Stream Keys in Dashboard**:
   - Open `http://your-vps-ip:3000`.
   - Enter your Twitch, YouTube, and Kick stream keys and toggle them ON.

4. **Step 4: OBS Studio Configuration**:
   - Settings > Stream > Custom...
   - Server: `rtmp://YOUR-VPS-IP:1935/live`
   - Stream Key: `YOUR_SECRET_INGEST_KEY`

5. **Step 5: Going Live**:
   - Click "Start Streaming" in OBS.
   - CSTREAM automatically distributes the feed to all active platforms.
