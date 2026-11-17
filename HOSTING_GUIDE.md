# CSTREAM Hosting & Deployment Guide ($3 - $4/mo VPS)

This guide walks you through setting up your personal cloud multistreamer on a **$3.50 – $4.00 / month VPS** in less than 5 minutes.

---

## Step 1: Rent Your $3–$4 Cloud VPS

We recommend **Hetzner Cloud** (the best performance and 20 TB bandwidth for ~€3.70) or **RackNerd** (~$1.75/mo).

### Option A: Hetzner Cloud (Recommended)
1. Go to [hetzner.com/cloud](https://www.hetzner.com/cloud) and sign up.
2. In the Hetzner Cloud Console, click **Add Server**.
3. **Location**: Choose the data center closest to your physical location (e.g., Nuremberg/Falkenstein for Europe, Ashburn/Hillsboro for US, Singapore for Asia).
4. **Image**: Choose **Ubuntu 24.04** or **Ubuntu 22.04**.
5. **Type**: Choose **Standard** > **CX22** (Intel 2 vCPU, 4GB RAM) or **CAX11** (ARM 2 vCPU, 4GB RAM). Cost is **~€3.79 / month** (~$4 USD).
6. Click **Create & Buy Now**. Within 30 seconds, Hetzner will email you your **Server IP** and **Root Password**.

---

## Step 2: Connect to Your Cloud VPS

On your Windows laptop, open **PowerShell** or **Command Prompt** and type:

```powershell
ssh root@YOUR_SERVER_IP
```
*(Replace `YOUR_SERVER_IP` with the IP Hetzner emailed you. When prompted for password, paste the root password).*

---

## Step 3: Deploy CSTREAM with One Command

Once logged into your server terminal, choose either method below:

### Method A: Clone from Git (Fastest)
```bash
git clone <YOUR_GIT_REPO_URL> cstream
cd cstream
chmod +x deploy.sh
./deploy.sh
```

### Method B: Copy from Your Laptop via SCP
From your laptop PowerShell in `f:/CSTREAM`:
```powershell
scp -r f:/CSTREAM root@YOUR_SERVER_IP:/root/cstream
```
Then on the server:
```bash
cd /root/cstream
chmod +x deploy.sh
./deploy.sh
```

The script will automatically:
- Install Docker and Docker Compose.
- Open firewall ports (`1935`, `3000`, `8000`).
- Start CSTREAM in the background.

---

## Step 4: Configure Your Stream Keys

1. Open your browser on your laptop or phone:
   ```
   http://YOUR_SERVER_IP:3000
   ```
2. You will see the **CSTREAM Upstream-Style Dashboard**.
3. Copy your **Master Stream Key** from the top-left card.
4. On each platform card (**YouTube, Kick, Twitch, Steam TV, Nimo TV, Rooter, X Live, Loco, Rumble**):
   - Click the link to open that platform's stream settings.
   - Paste your stream key and click **Save**.
   - Turn the switch **ON** for all platforms you want to stream to.

---

## Step 5: Configure OBS Studio on Your Gaming Laptop

In **OBS Studio** on your laptop:
1. Go to **Settings > Stream**.
2. **Service**: Select **Custom...**
3. **Server**: Enter:
   ```
   rtmp://YOUR_SERVER_IP:1935/live
   ```
4. **Stream Key**: Paste your **Master Stream Key** from Step 4.
5. In **Settings > Output**:
   - Encoder: **NVIDIA NVENC H.264** (or AMD HW H.264)
   - Rate Control: **CBR**
   - Bitrate: **8,000 kbps**
   - Keyframe Interval: **2 s**
   - Preset: **P5 / P6 (Quality)**
6. Click **OK**.

---

## Step 6: Go Live!

1. Start your game.
2. In OBS, click **Start Streaming**.
3. Your laptop uploads **1 stream (8 Mbps)** to your cloud server.
4. Your CSTREAM dashboard immediately lights up **LIVE**, and all 9 platforms start receiving your broadcast simultaneously!
5. Check your in-game FPS: **zero performance loss**!
