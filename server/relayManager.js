const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const storage = require('./storage');

function getFFmpegBinary() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  const isWin = process.platform === 'win32';
  const ext = isWin ? '.exe' : '';

  // Check bundled app binary directory
  const localAppBin = path.join(__dirname, '../bin', `ffmpeg${ext}`);
  if (fs.existsSync(localAppBin)) {
    return localAppBin;
  }

  // Check Electron packaged resources directory
  if (process.resourcesPath) {
    const resBin = path.join(process.resourcesPath, 'bin', `ffmpeg${ext}`);
    if (fs.existsSync(resBin)) return resBin;
    const resRootBin = path.join(process.resourcesPath, `ffmpeg${ext}`);
    if (fs.existsSync(resRootBin)) return resRootBin;
  }

  // Check user local install directory
  const userLocalBin = path.join(os.homedir(), '.local/node/bin', `ffmpeg${ext}`);
  if (fs.existsSync(userLocalBin)) {
    return userLocalBin;
  }

  // Common platform paths
  const commonPaths = isWin ? [
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
    path.join(os.homedir(), 'ffmpeg', 'bin', 'ffmpeg.exe'),
    path.join(os.homedir(), 'scoop', 'shims', 'ffmpeg.exe')
  ] : [
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg'
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }

  return isWin ? 'ffmpeg.exe' : 'ffmpeg';
}

class RelayManager {
  constructor() {
    this.activeWorkers = new Map(); // destId -> { process, status, stats, retryCount }
    this.isIngesting = false;
    this.currentStreamKey = null;
    this.onStatusChange = null;
    this.onLogMessage = null;
    this.ingestStartTime = null;
    this.globalStats = {
      fps: 0,
      bitrate: 0,
      uptime: 0,
      activeDestinationsCount: 0
    };
  }

  setCallbacks({ onStatusChange, onLogMessage }) {
    this.onStatusChange = onStatusChange;
    this.onLogMessage = onLogMessage;
  }

  log(destId, message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] [${destId ? destId.toUpperCase() : 'SYSTEM'}] ${message}`;
    console.log(formatted);
    if (this.onLogMessage) {
      this.onLogMessage({ destId, message, level, timestamp });
    }
  }

  notifyStatus() {
    if (this.onStatusChange) {
      this.onStatusChange(this.getLiveStatus());
    }
  }

  getLiveStatus() {
    const config = storage.getConfig();
    const destinationsStatus = config.destinations.map(d => {
      const worker = this.activeWorkers.get(d.id);
      return {
        id: d.id,
        name: d.name,
        enabled: d.enabled,
        hasKey: Boolean(d.streamKey && d.streamKey.trim().length > 0),
        status: worker ? worker.status : (this.isIngesting && d.enabled ? 'waiting' : 'idle'),
        stats: worker ? worker.stats : { fps: 0, bitrate: 0, speed: '0x' }
      };
    });

    const activeCount = Array.from(this.activeWorkers.values()).filter(w => w.status === 'live').length;

    return {
      isIngesting: this.isIngesting,
      uptime: this.ingestStartTime ? Math.floor((Date.now() - this.ingestStartTime) / 1000) : 0,
      activeDestinationsCount: activeCount,
      totalConfiguredCount: config.destinations.length,
      globalStats: this.globalStats,
      destinations: destinationsStatus
    };
  }

  /**
   * Called when OBS starts publishing RTMP to our server
   */
  startIngest(streamKey) {
    this.isIngesting = true;
    this.currentStreamKey = streamKey;
    this.ingestStartTime = Date.now();
    this.log(null, `Incoming stream detected from OBS with key: ${streamKey.substring(0, 4)}****`);

    const config = storage.getConfig();
    if (config.server.autoStartRelay) {
      this.startAllEnabledDestinations();
    }
    this.notifyStatus();
  }

  /**
   * Called when OBS stops streaming
   */
  stopIngest() {
    this.log(null, 'Incoming stream stopped from OBS.');
    this.isIngesting = false;
    this.currentStreamKey = null;
    this.ingestStartTime = null;
    this.stopAllRelays();
    this.notifyStatus();
  }

  buildTargetUrl(dest) {
    if (!dest.serverUrl) return null;
    let base = dest.serverUrl.trim().replace(/\/+$/, '');
    const key = (dest.streamKey || '').trim();

    // RTMPS requires explicit :443 for FFmpeg TLS handshake if not present
    if (base.startsWith('rtmps://') && !base.match(/^rtmps:\/\/[^/:]+:\d+/)) {
      base = base.replace(/^(rtmps:\/\/[^/]+)/, '$1:443');
    }

    // Ensure /app path is present for Kick & IVS endpoints if missing
    if (base.includes('global-contribute.live-video.net') && !base.endsWith('/app') && !base.includes('/app/')) {
      base = `${base}/app`;
    }

    return key ? `${base}/${key}` : base;
  }

  startRelayForDestination(destId) {
    if (!this.isIngesting) {
      this.log(destId, 'Cannot start relay: No incoming stream from OBS.');
      return false;
    }

    const config = storage.getConfig();
    const dest = config.destinations.find(d => d.id === destId);

    if (!dest || !dest.enabled) {
      this.log(destId, 'Destination is disabled.');
      return false;
    }

    if (!dest.serverUrl || !dest.serverUrl.trim()) {
      this.log(destId, 'Server URL is missing. Please set RTMP URL in dashboard.', 'warn');
      return false;
    }

    if (!dest.streamKey || !dest.streamKey.trim()) {
      // Check if serverUrl might already be a complete RTMP publish path
      if (!dest.serverUrl.includes('/', 8)) {
        this.log(destId, 'Stream key is missing. Please set stream key in dashboard.', 'warn');
        return false;
      }
    }

    // If already running and active, do not duplicate
    if (this.activeWorkers.has(destId)) {
      const existing = this.activeWorkers.get(destId);
      if (existing && existing.process && !existing.process.killed) {
        if (existing.status === 'live' || existing.status === 'starting') {
          return true;
        }
      } else {
        this.activeWorkers.delete(destId);
      }
    }

    const rtmpPort = config.server.rtmpPort || 1935;
    const inputUrl = `rtmp://127.0.0.1:${rtmpPort}/live/${this.currentStreamKey}`;
    const targetUrl = this.buildTargetUrl(dest);

    if (!targetUrl) {
      this.log(destId, 'Invalid target RTMP URL format.', 'error');
      return false;
    }

    this.log(destId, `Starting zero-CPU passthrough relay to ${dest.name}...`);

    // Ultra-stable zero-CPU live passthrough relay
    // Optimized for CDNs, AWS IVS (Kick & Loco), YouTube, and Twitch
    const args = [
      '-fflags', '+nobuffer+genpts',
      '-analyzeduration', '1000000',
      '-probesize', '1000000',
      '-rw_timeout', '15000000',
      '-i', inputUrl,
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-f', 'flv',
      '-flvflags', 'no_duration_filesize',
      '-max_interleave_delta', '100'
    ];

    // For RTMPS (AWS IVS on Kick/Loco & Rooter), skip OpenSSL peer cert check (macOS lacks Linux CA paths)
    if (targetUrl.startsWith('rtmps://')) {
      args.push('-tls_verify', '0');
    }

    args.push(targetUrl);

    const workerState = {
      process: null,
      status: 'starting',
      stats: { fps: 0, bitrate: 0, speed: '0x' },
      retryCount: 0,
      killedIntentionally: false
    };

    const ffmpegBin = getFFmpegBinary();

    try {
      const ffmpegProc = spawn(ffmpegBin, args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      workerState.process = ffmpegProc;
      this.activeWorkers.set(destId, workerState);

      // FFmpeg outputs progress to stderr
      ffmpegProc.stderr.on('data', (data) => {
        const text = data.toString();
        // Parse fps=60 q=-1.0 size= 256kB time=00:00:05.12 bitrate= 409.6kbits/s speed=1.02x
        const fpsMatch = text.match(/fps=\s*([\d.]+)/);
        const bitrateMatch = text.match(/bitrate=\s*([\d.]+)kbits\/s/);
        const speedMatch = text.match(/speed=\s*([\d.]+)x/);

        if (fpsMatch || bitrateMatch) {
          if (workerState.status !== 'live') {
            workerState.status = 'live';
            this.log(destId, `Broadcasting successfully connected to ${dest.name}!`);
            this.notifyStatus();
          }

          if (fpsMatch) workerState.stats.fps = parseFloat(fpsMatch[1]);
          if (bitrateMatch) workerState.stats.bitrate = parseFloat(bitrateMatch[1]);
          if (speedMatch) workerState.stats.speed = `${speedMatch[1]}x`;

          // Keep global stats fresh
          this.globalStats.fps = workerState.stats.fps;
          this.globalStats.bitrate = workerState.stats.bitrate;
        }

        // Detect connection warnings in stderr
        if (text.includes('Connection refused') || text.includes('Server returned 404') || text.includes('Broken pipe') || text.includes('Input/output error') || text.includes('End of file')) {
          this.log(destId, `Stream notice: ${text.trim().substring(0, 120)}`, 'warn');
        }
      });

      ffmpegProc.on('error', (err) => {
        if (err.code === 'ENOENT') {
          this.log(destId, 'FFmpeg binary not found on this machine.', 'error');
        } else {
          this.log(destId, `FFmpeg process error: ${err.message}`, 'error');
        }
      });

      ffmpegProc.on('close', (code) => {
        const isDead = workerState.killedIntentionally;
        this.activeWorkers.delete(destId);

        if (!isDead && this.isIngesting) {
          const freshConfig = storage.getConfig();
          const freshDest = freshConfig.destinations.find(d => d.id === destId);
          if (freshDest && freshDest.enabled) {
            this.log(destId, `Relay process closed (code ${code}). Auto-reconnecting in 8s...`, 'warn');
            setTimeout(() => {
              if (this.isIngesting) {
                this.startRelayForDestination(destId);
              }
            }, 8000);
          } else {
            this.log(destId, `Destination is disabled.`);
          }
        } else {
          this.log(destId, `Relay stopped.`);
        }
        this.notifyStatus();
      });

      this.notifyStatus();
      return true;
    } catch (err) {
      this.log(destId, `Failed to spawn FFmpeg: ${err.message}`, 'error');
      return false;
    }
  }

  stopRelayForDestination(destId) {
    const worker = this.activeWorkers.get(destId);
    if (!worker) return;

    worker.killedIntentionally = true;
    if (worker.process) {
      try {
        worker.process.kill('SIGTERM');
      } catch (e) {
        // ignore
      }
    }
    this.activeWorkers.delete(destId);
    this.log(destId, 'Relay manually stopped.');
    this.notifyStatus();
  }

  startAllEnabledDestinations() {
    const config = storage.getConfig();
    this.log(null, `Starting all active destinations (${config.destinations.filter(d => d.enabled).length} enabled)...`);
    for (const dest of config.destinations) {
      if (dest.enabled) {
        this.startRelayForDestination(dest.id);
      }
    }
  }

  stopAllRelays() {
    for (const destId of this.activeWorkers.keys()) {
      this.stopRelayForDestination(destId);
    }
    this.activeWorkers.clear();
  }
}

module.exports = new RelayManager();
