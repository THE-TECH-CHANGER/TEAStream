let socket = null;
let flvPlayer = null;
let currentConfig = null;
let currentStatus = null;
let currentIngestKey = '';

// DOM Elements
const liveIndicator = document.getElementById('live-indicator');
const statBitrate = document.getElementById('stat-bitrate');
const statFps = document.getElementById('stat-fps');
const statOutbound = document.getElementById('stat-outbound');
const statUptime = document.getElementById('stat-uptime');
const statActiveCount = document.getElementById('stat-active-count');

const videoElement = document.getElementById('video-player');
const playerStandby = document.getElementById('player-standby');
const playerStatusBadge = document.getElementById('player-status-badge');

const ingestUrlInput = document.getElementById('ingest-url');
const ingestKeyInput = document.getElementById('ingest-key');
const btnToggleKey = document.getElementById('btn-toggle-key');
const btnRegenKey = document.getElementById('btn-regen-key');

const destinationsGrid = document.getElementById('destinations-grid');
const logsContainer = document.getElementById('logs-container');
const logCountBadge = document.getElementById('log-count');

const btnBroadcastAll = document.getElementById('btn-broadcast-all');
const btnObsGuide = document.getElementById('btn-obs-guide');
const modalObs = document.getElementById('modal-obs');
const modalClose = document.getElementById('modal-close');
const modalServerUrl = document.getElementById('modal-server-url');
const modalStreamKey = document.getElementById('modal-stream-key');

let logEventsCount = 0;

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  setupDynamicHost();
  connectWebSocket();
  setupEventListeners();
});

function setupDynamicHost() {
  const host = window.location.hostname || 'localhost';
  const rtmpUrl = `rtmp://${host}:1935/live`;
  ingestUrlInput.value = rtmpUrl;
  modalServerUrl.innerText = rtmpUrl;
}

// WebSocket Connection
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    appendLog('SYSTEM', 'Connected to TEAstream Relay engine via WebSocket.');
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleSocketMessage(msg);
    } catch (e) {
      console.error('Error parsing WS message:', e);
    }
  };

  socket.onclose = () => {
    appendLog('SYSTEM', 'WebSocket disconnected. Retrying in 2 seconds...', 'warn');
    setTimeout(connectWebSocket, 2000);
  };
}

function handleSocketMessage(msg) {
  switch (msg.type) {
    case 'INIT_STATE':
      currentConfig = { server: msg.data.server, destinations: [] };
      applyServerConfig(msg.data.server);
      fetchFullConfig();
      updateStatus(msg.data.status);
      break;

    case 'STATUS_UPDATE':
    case 'HEARTBEAT':
      updateStatus(msg.data);
      break;

    case 'LOG_MESSAGE':
      appendLog(msg.data.destId, msg.data.message, msg.data.level);
      break;

    case 'DESTINATION_UPDATED':
      if (currentConfig && currentConfig.destinations) {
        const idx = currentConfig.destinations.findIndex(d => d.id === msg.data.id);
        if (idx !== -1) {
          currentConfig.destinations[idx] = { ...currentConfig.destinations[idx], ...msg.data };
          renderDestinations();
        }
      }
      break;

    case 'SERVER_CONFIG_UPDATED':
      applyServerConfig(msg.data);
      break;

    case 'SERVER_SHUTDOWN':
      appendLog('SYSTEM', 'TEAstream server is shutting down. All background relays stopped.', 'warn');
      const shutdownScreen = document.getElementById('shutdown-screen');
      if (shutdownScreen) {
        shutdownScreen.classList.remove('hidden');
      }
      break;
  }
}

// Fetch Full Config from REST API
async function fetchFullConfig() {
  try {
    const res = await fetch('/api/config');
    const json = await res.json();
    if (json.success) {
      currentConfig = json.data;
      applyServerConfig(json.data.server, json.data.localIp);
      renderDestinations();
    }
  } catch (err) {
    console.error('Failed to fetch config:', err);
  }
}

function applyServerConfig(server, localIp) {
  if (!server) return;
  currentIngestKey = server.ingestKey;
  ingestKeyInput.value = server.ingestKey;
  modalStreamKey.innerText = server.ingestKey;

  const currentHost = window.location.hostname || 'localhost';
  const effectiveHost = (currentHost === 'localhost' || currentHost === '127.0.0.1') && localIp ? localIp : currentHost;
  const rtmpUrl = `rtmp://${effectiveHost}:1935/live`;
  ingestUrlInput.value = rtmpUrl;
  modalServerUrl.innerText = rtmpUrl;

  const toggleAutoShutdown = document.getElementById('toggle-auto-shutdown');
  if (toggleAutoShutdown && typeof server.autoShutdownOnStreamEnd !== 'undefined') {
    toggleAutoShutdown.checked = Boolean(server.autoShutdownOnStreamEnd);
  }
}

// Render Destination Cards
function renderDestinations() {
  if (!currentConfig || !currentConfig.destinations) return;

  destinationsGrid.innerHTML = '';

  currentConfig.destinations.forEach(dest => {
    const card = document.createElement('div');
    card.className = `platform-card ${dest.enabled ? 'active' : ''}`;
    card.style.setProperty('--platform-color', dest.color || '#888888');
    card.id = `dest-card-${dest.id}`;

    // Get live status if available
    let statusText = dest.enabled ? 'Enabled' : 'Disabled';
    let statusClass = dest.enabled ? 'waiting' : 'idle';

    if (currentStatus && currentStatus.destinations) {
      const match = currentStatus.destinations.find(d => d.id === dest.id);
      if (match) {
        if (match.status === 'live') {
          statusText = '● LIVE (Streaming)';
          statusClass = 'live';
        } else if (match.status === 'starting') {
          statusText = 'Connecting...';
          statusClass = 'waiting';
        } else if (dest.enabled && currentStatus.isIngesting) {
          statusText = 'Waiting';
          statusClass = 'waiting';
        }
      }
    }

    card.innerHTML = `
      <div class="platform-top-bar">
        <div class="platform-identity">
          <div class="platform-icon-box">
            ${getPlatformIcon(dest.id)}
          </div>
          <div>
            <div class="platform-name-title">${dest.name}</div>
            <span class="platform-substatus ${statusClass}" id="status-tag-${dest.id}">${statusText}</span>
          </div>
        </div>

        <div class="platform-header-actions">
          ${dest.isCustom ? `
            <button class="btn-delete-dest" onclick="deletePlatform('${dest.id}')" title="Delete custom destination">🗑️</button>
          ` : ''}
          <label class="switch">
            <input type="checkbox" id="toggle-${dest.id}" ${dest.enabled ? 'checked' : ''} onchange="togglePlatform('${dest.id}', this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="platform-fields">
        <!-- RTMP Server URL Input -->
        <div class="platform-field-group">
          <div class="platform-field-label-row">
            <label>RTMP SERVER URL</label>
            ${!dest.isCustom ? `
              <button class="btn-reset-url" type="button" onclick="resetPlatformUrl('${dest.id}')" title="Reset URL to default preset">Reset</button>
            ` : ''}
          </div>
          <div class="platform-input-wrap">
            <input type="text" id="url-${dest.id}" placeholder="rtmp:// or rtmps://..." value="${dest.serverUrl || ''}">
          </div>
        </div>

        <!-- Stream Key Input -->
        <div class="platform-field-group">
          <div class="platform-field-label-row">
            <label>STREAM KEY</label>
          </div>
          <div class="platform-input-wrap">
            <input type="password" id="key-${dest.id}" placeholder="Paste ${dest.name} stream key..." value="${dest.streamKey || ''}">
            <button class="btn-icon" type="button" onclick="toggleKeyVisibility('key-${dest.id}')" title="Show / Hide">👁️</button>
          </div>
        </div>
      </div>

      <div class="platform-card-footer">
        <button class="btn-save-platform" id="btn-save-${dest.id}" onclick="savePlatformConfig('${dest.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          Save
        </button>
        ${dest.guideUrl ? `
          <a href="${dest.guideUrl}" target="_blank" rel="noopener noreferrer" class="platform-link">
            Get Key ↗
          </a>
        ` : ''}
      </div>
    `;

    destinationsGrid.appendChild(card);
  });
}

function truncateUrl(url) {
  if (!url) return '';
  return url.replace('rtmp://', '').substring(0, 24) + '...';
}

function getPlatformIcon(id) {
  switch (id) {
    case 'youtube': return '▶';
    case 'kick': return '⚡';
    case 'twitch': return '👾';
    case 'steam': return '🎮';
    case 'nimotv': return '🟣';
    case 'rooter': return '🟠';
    case 'xlive': return '𝕏';
    case 'loco': return '💠';
    case 'rumble': return '🟢';
    default: return '📡';
  }
}

// Update Live Status & Player
function updateStatus(status) {
  if (!status) return;
  currentStatus = status;

  // Header status pill
  if (status.isIngesting) {
    liveIndicator.className = 'status-pill live';
    liveIndicator.querySelector('.status-label').innerText = 'LIVE RELAYING';
    playerStatusBadge.className = 'badge info';
    playerStatusBadge.innerText = 'Broadcasting';
    playerStandby.classList.add('hidden');
    startPlayer();
  } else {
    liveIndicator.className = 'status-pill offline';
    liveIndicator.querySelector('.status-label').innerText = 'OFFLINE';
    playerStatusBadge.className = 'badge';
    playerStatusBadge.innerText = 'Standby';
    playerStandby.classList.remove('hidden');
    stopPlayer();
  }

  // Telemetry
  const incomingBitrate = status.globalStats?.bitrate || 0;
  statBitrate.innerText = `${Math.round(incomingBitrate)} kbps`;
  statFps.innerText = `${Math.round(status.globalStats?.fps || 0)}`;

  // Outbound Total = active channels * bitrate
  const activeCount = status.activeDestinationsCount || 0;
  const outboundMbps = ((incomingBitrate * activeCount) / 1000).toFixed(1);
  statOutbound.innerText = `${outboundMbps} Mbps`;

  statActiveCount.innerText = `${activeCount} / ${status.totalConfiguredCount || 9}`;
  statUptime.innerText = formatUptime(status.uptime || 0);

  // Update per-destination status tags
  if (status.destinations) {
    status.destinations.forEach(d => {
      const tag = document.getElementById(`status-tag-${d.id}`);
      if (tag) {
        if (d.status === 'live') {
          tag.className = 'platform-substatus live';
          tag.innerText = '● LIVE (Streaming)';
        } else if (d.status === 'starting') {
          tag.className = 'platform-substatus waiting';
          tag.innerText = 'Connecting...';
        } else if (d.enabled && status.isIngesting) {
          tag.className = 'platform-substatus waiting';
          tag.innerText = 'Waiting';
        } else {
          tag.className = 'platform-substatus idle';
          tag.innerText = d.enabled ? 'Enabled' : 'Disabled';
        }
      }
    });
  }
}

function formatUptime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Live FLV Player Control
function startPlayer() {
  if (flvPlayer || !flvjs.isSupported()) return;

  const host = window.location.hostname || 'localhost';
  const flvUrl = `http://${host}:8000/live/${currentIngestKey}.flv`;

  try {
    flvPlayer = flvjs.createPlayer({
      type: 'flv',
      isLive: true,
      url: flvUrl
    }, {
      enableStashBuffer: false,
      lazyLoad: false,
      autoCleanupSourceBuffer: true
    });

    flvPlayer.attachMediaElement(videoElement);
    flvPlayer.load();
    flvPlayer.play().catch(e => console.warn('Autoplay prevented:', e));
  } catch (err) {
    console.error('FLV player error:', err);
  }
}

function stopPlayer() {
  if (flvPlayer) {
    try {
      flvPlayer.pause();
      flvPlayer.unload();
      flvPlayer.detachMediaElement();
      flvPlayer.destroy();
    } catch (e) {}
    flvPlayer = null;
  }
}

// UI Actions
async function togglePlatform(id, enabled) {
  try {
    const res = await fetch(`/api/destinations/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    const json = await res.json();
    if (json.success) {
      appendLog(id, `Switched ${enabled ? 'ON' : 'OFF'}`);
      showToast(`${id.toUpperCase()} turned ${enabled ? 'ON' : 'OFF'}`);
    }
  } catch (err) {
    console.error('Failed to toggle:', err);
    showToast(`Failed to toggle ${id}`, 'error', '#EF4444');
  }
}

async function savePlatformConfig(id) {
  const urlInput = document.getElementById(`url-${id}`);
  const keyInput = document.getElementById(`key-${id}`);
  const saveBtn = document.getElementById(`btn-save-${id}`);

  const serverUrl = urlInput ? urlInput.value.trim() : '';
  const streamKey = keyInput ? keyInput.value.trim() : '';

  try {
    const res = await fetch(`/api/destinations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverUrl, streamKey })
    });
    const json = await res.json();
    if (json.success) {
      appendLog(id, 'Settings & RTMP URL updated successfully!');
      showToast(`Configuration saved for ${json.data.name || id.toUpperCase()}! ✓`);

      if (saveBtn) {
        saveBtn.classList.add('saved');
        saveBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Saved!
        `;
        setTimeout(() => {
          saveBtn.classList.remove('saved');
          saveBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Save
          `;
        }, 2000);
      }
    }
  } catch (err) {
    showToast(`Failed to save ${id.toUpperCase()}`, 'error', '#EF4444');
  }
}

async function resetPlatformUrl(id) {
  if (!confirm(`Reset RTMP Server URL to default preset for this platform?`)) return;

  try {
    const res = await fetch(`/api/destinations/${id}/reset`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      const urlInput = document.getElementById(`url-${id}`);
      if (urlInput) urlInput.value = json.data.serverUrl || '';
      appendLog(id, 'Reset to default preset URL.');
      showToast(`Reset to default URL for ${json.data.name}! ✓`);
    }
  } catch (err) {
    showToast(`Failed to reset URL for ${id}`, 'error', '#EF4444');
  }
}

async function deletePlatform(id) {
  if (!confirm(`Are you sure you want to delete this custom destination?`)) return;

  try {
    const res = await fetch(`/api/destinations/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      appendLog(id, 'Custom destination deleted.');
      showToast('Custom destination removed.');
      fetchFullConfig();
    }
  } catch (err) {
    showToast('Failed to delete destination', 'error', '#EF4444');
  }
}

function toggleKeyVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

function copyText(elementId) {
  const input = document.getElementById(elementId);
  if (!input) return;
  navigator.clipboard.writeText(input.value).then(() => {
    showToast('Copied to clipboard: ' + input.value);
  });
}

function showToast(message, type = 'success', color = '#10B981') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.setProperty('--toast-color', color);
  toast.innerHTML = `
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function appendLog(destId, message, level = 'info') {
  logEventsCount++;
  logCountBadge.innerText = `${logEventsCount} events`;

  const line = document.createElement('div');
  line.className = `log-line ${level}`;
  const time = new Date().toLocaleTimeString();
  line.innerText = `[${time}] [${destId ? destId.toUpperCase() : 'SYSTEM'}] ${message}`;

  logsContainer.prepend(line);
}

// Event Listeners
function setupEventListeners() {
  btnToggleKey.addEventListener('click', () => {
    ingestKeyInput.type = ingestKeyInput.type === 'password' ? 'text' : 'password';
  });

  btnRegenKey.addEventListener('click', async () => {
    if (!confirm('Regenerate your Master Ingest Key? You will need to update OBS with the new key.')) return;
    try {
      const res = await fetch('/api/server/ingest-key', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        applyServerConfig(json.data);
        showToast('New Master Ingest Key generated!');
      }
    } catch (e) {
      showToast('Failed to regenerate key', 'error', '#EF4444');
    }
  });

  btnBroadcastAll.addEventListener('click', async () => {
    try {
      await fetch('/api/relay/broadcast-all', { method: 'POST' });
      appendLog('SYSTEM', 'Triggered Broadcast All to all enabled destinations.');
      showToast('Broadcasting to all enabled destinations! 🚀');
    } catch (e) {}
  });

  btnObsGuide.addEventListener('click', () => {
    modalObs.classList.add('open');
  });

  modalClose.addEventListener('click', () => {
    modalObs.classList.remove('open');
  });

  modalObs.addEventListener('click', (e) => {
    if (e.target === modalObs) modalObs.classList.remove('open');
  });

  // Custom RTMP Modal Setup
  const modalAddCustom = document.getElementById('modal-add-custom');
  const btnAddCustom = document.getElementById('btn-add-custom');
  const modalCustomClose = document.getElementById('modal-custom-close');
  const btnCancelCustom = document.getElementById('btn-cancel-custom');
  const formAddCustom = document.getElementById('form-add-custom');

  if (btnAddCustom && modalAddCustom) {
    btnAddCustom.addEventListener('click', () => {
      modalAddCustom.classList.add('open');
      document.getElementById('custom-name').focus();
    });

    const closeCustomModal = () => {
      modalAddCustom.classList.remove('open');
      formAddCustom.reset();
    };

    if (modalCustomClose) modalCustomClose.addEventListener('click', closeCustomModal);
    if (btnCancelCustom) btnCancelCustom.addEventListener('click', closeCustomModal);

    modalAddCustom.addEventListener('click', (e) => {
      if (e.target === modalAddCustom) closeCustomModal();
    });

    formAddCustom.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('custom-name').value.trim();
      const serverUrl = document.getElementById('custom-url').value.trim();
      const streamKey = document.getElementById('custom-key').value.trim();
      const color = document.getElementById('custom-color').value;

      if (!name || !serverUrl) return;

      try {
        const res = await fetch('/api/destinations/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, serverUrl, streamKey, color })
        });
        const json = await res.json();
        if (json.success) {
          closeCustomModal();
          showToast(`Added ${name} destination! ✓`);
          fetchFullConfig();
        }
      } catch (err) {
        showToast('Failed to add custom destination', 'error', '#EF4444');
      }
    });
  }

  // Auto-Shutdown Toggle
  const toggleAutoShutdown = document.getElementById('toggle-auto-shutdown');
  if (toggleAutoShutdown) {
    toggleAutoShutdown.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      try {
        const res = await fetch('/api/server/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ autoShutdownOnStreamEnd: enabled })
        });
        const json = await res.json();
        if (json.success) {
          showToast(enabled ? 'Auto-Stop when OBS ends: Enabled' : 'Auto-Stop when OBS ends: Disabled');
        }
      } catch (err) {
        showToast('Failed to update setting', 'error', '#EF4444');
      }
    });
  }

  // Shutdown Hub Controls
  const btnShutdownServer = document.getElementById('btn-shutdown-server');
  const modalShutdown = document.getElementById('modal-shutdown');
  const modalShutdownClose = document.getElementById('modal-shutdown-close');
  const btnCancelShutdown = document.getElementById('btn-cancel-shutdown');
  const btnConfirmShutdown = document.getElementById('btn-confirm-shutdown');
  const shutdownScreen = document.getElementById('shutdown-screen');

  if (btnShutdownServer && modalShutdown) {
    btnShutdownServer.addEventListener('click', () => {
      modalShutdown.classList.add('open');
    });

    const closeShutdownModal = () => {
      modalShutdown.classList.remove('open');
    };

    if (modalShutdownClose) modalShutdownClose.addEventListener('click', closeShutdownModal);
    if (btnCancelShutdown) btnCancelShutdown.addEventListener('click', closeShutdownModal);

    modalShutdown.addEventListener('click', (e) => {
      if (e.target === modalShutdown) closeShutdownModal();
    });

    if (btnConfirmShutdown) {
      btnConfirmShutdown.addEventListener('click', async () => {
        closeShutdownModal();
        if (shutdownScreen) {
          shutdownScreen.classList.remove('hidden');
        }
        showToast('Stopping TEAstream Hub...', 'info');

        try {
          await fetch('/api/server/shutdown', { method: 'POST' });
        } catch (e) {
          // Expected network error when server terminates
        }
      });
    }
  }
}
