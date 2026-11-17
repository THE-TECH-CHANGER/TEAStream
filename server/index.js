const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const storage = require('./storage');
const relayManager = require('./relayManager');
const { createNMS } = require('./nms');
const { setupWebSocket, broadcast } = require('./wsServer');

// Prevent MacBook from sleeping while TEAstream is running
let caffeinateProcess = null;
if (process.platform === 'darwin') {
  try {
    caffeinateProcess = spawn('caffeinate', ['-dimsu', '-w', String(process.pid)], {
      detached: true,
      stdio: 'ignore'
    });
    caffeinateProcess.unref();
    console.log('[System] macOS Sleep Prevention active (caffeinate enabled).');
  } catch (e) {
    // ignore
  }
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ---------------- REST API ----------------

// Get full configuration & destinations
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      ...storage.getConfig(),
      localIp: getLocalIp()
    }
  });
});

// Get current live status & metrics
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: relayManager.getLiveStatus()
  });
});

// Toggle destination enabled/disabled
app.post('/api/destinations/:id/toggle', (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;

  const updated = storage.toggleDestination(id, Boolean(enabled));
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Destination not found' });
  }

  // If we are currently live, dynamically start or stop the relay worker
  if (relayManager.isIngesting) {
    if (enabled) {
      relayManager.startRelayForDestination(id);
    } else {
      relayManager.stopRelayForDestination(id);
    }
  }

  broadcast({
    type: 'DESTINATION_UPDATED',
    data: updated
  });

  res.json({ success: true, data: updated });
});

// Update stream key for a destination
app.post('/api/destinations/:id/key', (req, res) => {
  const { id } = req.params;
  const { streamKey } = req.body;

  const updated = storage.setStreamKey(id, streamKey ? streamKey.trim() : '');
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Destination not found' });
  }

  broadcast({
    type: 'DESTINATION_UPDATED',
    data: updated
  });

  res.json({ success: true, data: updated });
});

// Update destination details (URL, name, streamKey, etc.)
app.put('/api/destinations/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const updated = storage.updateDestination(id, updates);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Destination not found' });
  }

  // If we are currently live and this destination is enabled, hot-reload the relay worker
  if (relayManager.isIngesting && updated.enabled) {
    relayManager.stopRelayForDestination(id);
    setTimeout(() => {
      if (relayManager.isIngesting) {
        relayManager.startRelayForDestination(id);
      }
    }, 1000);
  }

  broadcast({
    type: 'DESTINATION_UPDATED',
    data: updated
  });

  res.json({ success: true, data: updated });
});

// Reset preset destination URL to defaults
app.post('/api/destinations/:id/reset', (req, res) => {
  const { id } = req.params;
  const reset = storage.resetDestination(id);
  if (!reset) {
    return res.status(404).json({ success: false, error: 'Preset destination not found' });
  }

  if (relayManager.isIngesting && reset.enabled) {
    relayManager.stopRelayForDestination(id);
    setTimeout(() => {
      if (relayManager.isIngesting) {
        relayManager.startRelayForDestination(id);
      }
    }, 1000);
  }

  broadcast({
    type: 'DESTINATION_UPDATED',
    data: reset
  });

  res.json({ success: true, data: reset });
});

// Add custom RTMP destination
app.post('/api/destinations/custom', (req, res) => {
  const { name, serverUrl, streamKey, color } = req.body;
  if (!name || !serverUrl) {
    return res.status(400).json({ success: false, error: 'Name and Server URL are required' });
  }

  const newDest = {
    id: 'custom_' + Date.now(),
    name,
    icon: 'custom',
    color: color || '#888888',
    enabled: true,
    serverUrl,
    streamKey: streamKey || '',
    isCustom: true
  };

  const config = storage.getConfig();
  config.destinations.push(newDest);
  storage.saveConfig(config);

  broadcast({
    type: 'DESTINATION_ADDED',
    data: newDest
  });

  res.json({ success: true, data: newDest });
});

// Delete custom destination
app.delete('/api/destinations/:id', (req, res) => {
  const { id } = req.params;
  const config = storage.getConfig();
  const index = config.destinations.findIndex(d => d.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Destination not found' });
  }

  // Stop relay if active
  relayManager.stopRelayForDestination(id);

  config.destinations.splice(index, 1);
  storage.saveConfig(config);

  broadcast({
    type: 'DESTINATION_REMOVED',
    data: { id }
  });

  res.json({ success: true, id });
});

// Update Master Ingest Key
app.post('/api/server/ingest-key', (req, res) => {
  const { ingestKey } = req.body;
  const newKey = ingestKey || ('cstream_live_' + Math.random().toString(36).substring(2, 10));

  const updated = storage.updateServerConfig({ ingestKey: newKey });

  broadcast({
    type: 'SERVER_CONFIG_UPDATED',
    data: updated
  });

  res.json({ success: true, data: updated });
});

// Update server settings (e.g. autoShutdownOnStreamEnd)
app.post('/api/server/settings', (req, res) => {
  const { autoShutdownOnStreamEnd, autoStartRelay } = req.body;
  const updates = {};
  if (typeof autoShutdownOnStreamEnd === 'boolean') {
    updates.autoShutdownOnStreamEnd = autoShutdownOnStreamEnd;
  }
  if (typeof autoStartRelay === 'boolean') {
    updates.autoStartRelay = autoStartRelay;
  }

  const updated = storage.updateServerConfig(updates);

  broadcast({
    type: 'SERVER_CONFIG_UPDATED',
    data: updated
  });

  res.json({ success: true, data: updated });
});

// Manual master controls
app.post('/api/relay/broadcast-all', (req, res) => {
  relayManager.startAllEnabledDestinations();
  res.json({ success: true });
});

app.post('/api/relay/stop-all', (req, res) => {
  relayManager.stopAllRelays();
  res.json({ success: true });
});

// Graceful server shutdown endpoint
app.post(['/api/server/shutdown', '/api/server/stop'], (req, res) => {
  res.json({
    success: true,
    message: 'TEAstream server is shutting down gracefully. All background processes will stop.'
  });
  setTimeout(() => {
    gracefulShutdown('Web Dashboard shutdown button');
  }, 500);
});

// ---------------- STARTUP & SHUTDOWN ----------------
let isShuttingDown = false;

function gracefulShutdown(reason = 'Signal received') {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[System] Graceful shutdown initiated (${reason})...`);

  // 1. Broadcast shutdown to all WebSocket clients
  try {
    broadcast({
      type: 'SERVER_SHUTDOWN',
      data: { message: 'TEAstream server is shutting down. All background processes stopped.' }
    });
  } catch (e) {}

  // 2. Terminate all active FFmpeg relay processes
  try {
    relayManager.stopAllRelays();
    console.log('[System] All FFmpeg relay processes stopped.');
  } catch (e) {}

  // Force kill any remaining ffmpeg processes via shell
  try {
    const isWin = process.platform === 'win32';
    if (isWin) {
      require('child_process').execSync('taskkill /F /IM ffmpeg.exe 2>nul', { stdio: 'ignore' });
    } else {
      require('child_process').execSync('pkill -f "ffmpeg" 2>/dev/null', { stdio: 'ignore' });
    }
  } catch (e) {}

  // 3. Stop RTMP Ingestion Server
  try {
    if (nms && typeof nms.stop === 'function') {
      nms.stop();
      console.log('[System] NodeMediaServer stopped.');
    }
  } catch (e) {}

  // 4. Terminate caffeinate sleep lock
  if (caffeinateProcess) {
    try {
      caffeinateProcess.kill('SIGTERM');
      console.log('[System] macOS Sleep Prevention released.');
    } catch (e) {}
  }

  // 5. Close HTTP web server
  server.close(() => {
    console.log('[System] TEAstream Web Server closed. Goodbye! 🍵');
    process.exit(0);
  });

  // Force exit after 2.5s if anything lingers
  setTimeout(() => {
    process.exit(0);
  }, 2500);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT / Ctrl+C'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

const config = storage.getConfig();
const webPort = process.env.PORT || config.server.webPort || 3000;
const localIp = getLocalIp();

// 1. Setup WebSocket server
setupWebSocket(server);

// 2. Start RTMP Ingestion Server (NodeMediaServer)
const nms = createNMS();
nms.run();

// 3. Start Express Web Server
server.listen(webPort, '0.0.0.0', () => {
  console.log(`
=============================================================
  🍵 TEAstream - Multistream Relay Hub (Active) 🍵
=============================================================
  🖥️  FROM YOUR BROADCAST PC (Windows / Linux / Mac):
  • OBS Server:     rtmp://${localIp}:${config.server.rtmpPort}/live
  • OBS Stream Key: ${config.server.ingestKey}
  • Web Dashboard:  http://${localIp}:${webPort}

  🏠 LOCAL ACCESS:
  • Web Dashboard:  http://localhost:${webPort}
  • Ingest Stream:  rtmp://localhost:${config.server.rtmpPort}/live
=============================================================
  Ready to relay to YouTube, Kick, Twitch, Steam, Nimo,
  Rooter, X Live, Loco, and Rumble simultaneously!
=============================================================
  `);
});
