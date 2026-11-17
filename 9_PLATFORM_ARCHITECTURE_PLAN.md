# 9-Platform Cloud Multistreaming Architecture
### How Multiple RTMP Endpoints & Different Stream Keys Work

---

## 1. The Core Question: How Does 1 Stream Go to 9 Different Platforms?

Each platform in your list (**YouTube, Kick, Twitch, Steam TV, Nimo TV, Rooter, X Live, Loco, Rumble**) has:
1. Its **own unique RTMP ingest server address** (e.g., `rtmp://a.rtmp.youtube.com/live2`, `rtmp://live.twitch.tv/app`).
2. Its **own unique private stream key** (e.g., `live_12345_abc`, `sk_us_xyz`).

### Why Your Laptop Cannot Handle This
If your laptop had to push to all 9 platforms directly:
- OBS would have to create **9 separate internet upload connections**.
- At 8,000 kbps (8 Mbps) per platform, your laptop would need:
  $$9 \times 8\text{ Mbps} = \mathbf{72\text{ Mbps Continuous Upload}}$$
- Your laptop's GPU/CPU would throttle, network jitter would spike, and your gaming performance would be ruined.

---

## 2. How the Cloud Solves It: The "Master Ingest & Fan-Out" Relay

Instead of connecting to 9 platforms, your laptop connects to **only ONE**:

```
                       [ YOUR GAMING LAPTOP (OBS STUDIO) ]
                                        │
                                        │ 1 Single Stream (8 Mbps)
                                        │ Server: rtmp://YOUR-VPS-IP:1935/live
                                        │ Key: YOUR_MASTER_KEY
                                        ▼
             ┌───────────────────────────────────────────────────────┐
             │            YOUR CLOUD RELAY SERVER (VPS)              │
             │                                                       │
             │  1. Ingest Port (1935):                               │
             │     Receives the H.264/AAC packets from your laptop   │
             │                                                       │
             │  2. Key Verification:                                 │
             │     Validates YOUR_MASTER_KEY. Rejects all outsiders  │
             │                                                       │
             │  3. Multi-Target Dispatcher:                          │
             │     Reads the 9 target keys stored in config.json     │
             │     Spawns 9 zero-CPU packet copy worker pipelines    │
             └──────────────────────────┬────────────────────────────┘
                                        │
         ┌──────────────┬───────────────┼──────────────┬──────────────┐
         │              │               │              │              │
         ▼              ▼               ▼              ▼              ▼
     [ YouTube ]     [ Kick ]       [ Twitch ]    [ Steam TV ]   [ Nimo TV ]
   rtmp://youtube/ rtmp://kick/   rtmp://twitch/  rtmp://steam/  rtmp://nimo/
     (Key #1)       (Key #2)        (Key #3)       (Key #4)       (Key #5)
         │              │               │              │              │
         ├──────────────┼───────────────┴──────────────┴──────────────┘
         ▼              ▼               ▼              ▼
     [ Rooter ]     [ X Live ]       [ Loco ]      [ Rumble ]
   rtmp://rooter/   rtmp://x/      rtmp://loco/   rtmp://rumble/
     (Key #6)       (Key #7)        (Key #8)       (Key #9)
```

---

## 3. The 9 Platforms: RTMP Addresses & Where Keys Come From

You enter each platform's stream key **once** into your CSTREAM cloud web dashboard. The server securely stores them in an encrypted/private config file.

| # | Platform | RTMP Ingest Server URL | Where to Get Your Stream Key | Default Bitrate / Limit |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **YouTube Live** | `rtmp://a.rtmp.youtube.com/live2` | [YouTube Studio > Go Live](https://studio.youtube.com/channel/UC/livestreaming/dashboard) | 6,000 – 9,000 kbps |
| **2** | **Kick** | `rtmp://fa723794b449.global-contribute.live-video.net/app` | [Kick Creator Dashboard > Settings > Stream](https://kick.com/dashboard/settings/stream) | 6,000 – 8,000 kbps |
| **3** | **Twitch** | `rtmp://live.twitch.tv/app` | [Twitch Creator Dashboard > Settings > Stream](https://dashboard.twitch.tv/settings/stream) | 6,000 kbps (Max 8,000) |
| **4** | **Steam TV** | `rtmp://broadcast.steamcontent.com/broadcast` | [Steam Broadcast Setup](https://steamcommunity.com/broadcast/upload) | 3,500 – 6,000 kbps |
| **5** | **Nimo TV** | `rtmp://txpush.nimo.tv/live` | [Nimo TV Creator Center](https://creator.nimo.tv) | 4,000 – 6,000 kbps |
| **6** | **Rooter** | `rtmp://live.rooter.io/live` *(or assigned RTMP)* | [Rooter Creator Studio](https://creator.rooter.gg) | 4,000 – 6,000 kbps |
| **7** | **X Live (Twitter)** | `rtmp://va.pscp.tv:80/x` | [Twitter Media Studio > Producer](https://studio.twitter.com/producer) | 4,000 – 6,000 kbps |
| **8** | **Loco** | `rtmp://live.loco.gg/live` *(or assigned RTMP)* | [Loco Studio Dashboard](https://studio.loco.gg) | 4,000 – 6,000 kbps |
| **9** | **Rumble** | `rtmp://live.rumble.com/live` | [Rumble Live Stream Setup](https://rumble.com/live-stream-setup) | 4,000 – 6,000 kbps |

---

## 4. How the Relay Engine Handles 9 Keys Simultaneously

### A. Zero-CPU Packet Multiplexing
Inside the cloud server, the relay engine uses **bitstream copying** (`-c copy`):
```bash
# Example of what the server executes under the hood:
ffmpeg -re -i rtmp://127.0.0.1:1935/live/{MASTER_KEY} \
  -c:v copy -c:a copy -f flv "rtmp://a.rtmp.youtube.com/live2/{YOUTUBE_KEY}" \
  -c:v copy -c:a copy -f flv "rtmp://fa723794b449.global-contribute.live-video.net/app/{KICK_KEY}" \
  -c:v copy -c:a copy -f flv "rtmp://live.twitch.tv/app/{TWITCH_KEY}" \
  ... (and so on for all 9)
```
- **Why this uses 0% CPU**: The video frame pixels are **never decompressed or processed**. The server simply reads incoming network packets from OBS and forwards them into 9 outgoing network sockets.
- A $4/month VPS with 1 vCPU and 1GB RAM can easily handle packet forwarding for 9 streams because it is purely a network operation, not a rendering operation.

### B. Independent Process Isolation (Fault Tolerance)
What if **Steam TV** has maintenance, or you accidentally entered a wrong key for **Loco**?
* In our architecture, **each platform runs in its own isolated supervisor worker**.
* If **Loco** drops connection, **YouTube, Kick, Twitch, and the other 7 platforms keep streaming with ZERO interruption**.
* The server automatically logs the error and attempts to reconnect to the failed platform every 5 seconds without touching the active ones.

### C. Master Ingest Key Protection
Your cloud server has a public IP address. To prevent strangers from streaming through your server:
* You set a **Master Ingest Key** (e.g. `cstream_secret_99812`).
* When OBS connects to `rtmp://YOUR-VPS-IP:1935/live/cstream_secret_99812`, the server checks the key.
* If someone tries to connect without the key, the connection is instantly rejected.

---

## 5. Master Execution Plan: Step-by-Step

### Phase 1: Build the Multi-Platform Cloud Package (Here in `f:/CSTREAM`)
1. **Multi-Destination Storage**: Secure storage (`config.json`) supporting all 9 platforms with individual enable/disable switches.
2. **Dynamic Relay Supervisor**: Process manager that spawns isolated passthrough streams for all active platforms.
3. **Web Control Dashboard (Upstream-style)**:
   - 9 branded platform cards (YouTube Red, Kick Green, Twitch Purple, Steam Blue, Nimo Purple, Rooter Orange, X White, Loco Teal, Rumble Green).
   - One-click toggle switch on every card.
   - Stream key input fields with show/hide password buttons.
   - Master "Go Live to All" button.
   - Live stream preview player and telemetry dials (bitrate, fps, duration).
4. **Cloud Containerization**:
   - `Dockerfile` (Node.js 22 + FFmpeg).
   - `docker-compose.yml` (Ports 1935 for RTMP, 3000 for Web Dashboard).
   - `deploy.sh` (1-click script for Ubuntu/Debian cloud servers).

### Phase 2: Cloud Server Setup (One-time, 5 Minutes)
1. You rent a $4/month VPS (e.g., Hetzner Cloud CX22 or DigitalOcean).
2. SSH into your VPS:
   ```bash
   ssh root@YOUR_SERVER_IP
   ```
3. Run our 1-click deployment command:
   ```bash
   git clone <your-repo> cstream && cd cstream && docker compose up -d
   ```
   *(The server is now live 24/7 on the internet)*.

### Phase 3: Setup Keys in Dashboard (One-time, 5 Minutes)
1. Open your browser on your laptop or phone: `http://YOUR_SERVER_IP:3000`.
2. Paste your stream keys into the cards for YouTube, Kick, Twitch, Steam, Nimo, Rooter, X, Loco, and Rumble.
3. Toggle ON the platforms you want active today.

### Phase 4: Configure OBS on Your Laptop (One-time, 1 Minute)
In OBS Studio on your gaming laptop:
1. Open **Settings > Stream**.
2. Service: **Custom...**
3. Server: `rtmp://YOUR_SERVER_IP:1935/live`
4. Stream Key: `YOUR_MASTER_KEY` (shown in your dashboard).
5. Done! You never have to touch stream settings in OBS again.

### Phase 5: Going Live
1. Start playing your game.
2. Hit **"Start Streaming"** in OBS.
3. Your laptop uploads **1 stream (8 Mbps)** to your cloud server.
4. Your cloud server instantly pushes your gameplay to all 9 platforms simultaneously!
