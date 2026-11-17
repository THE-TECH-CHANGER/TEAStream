const { app, BrowserWindow, Menu, Tray, shell } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// 1. Ensure internal TEAstream server is running
function ensureServerRunning() {
  return new Promise((resolve) => {
    const ping = () => {
      return new Promise((res) => {
        const req = http.get('http://127.0.0.1:3000/api/status', (r) => {
          res(r.statusCode === 200);
        });
        req.on('error', () => res(false));
        req.setTimeout(800, () => {
          req.destroy();
          res(false);
        });
      });
    };

    ping().then(async (alreadyRunning) => {
      if (alreadyRunning) {
        return resolve(true);
      }

      console.log('[TEAstream Desktop] Starting internal relay server...');
      try {
        require('../server/index.js');
      } catch (err) {
        console.error('[TEAstream Desktop] Error starting server:', err);
      }

      // Poll until server is responding (up to 30 attempts x 200ms = 6s)
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 200));
        const ok = await ping();
        if (ok) {
          console.log('[TEAstream Desktop] Server ready!');
          return resolve(true);
        }
      }
      resolve(false);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    title: 'TEAstream — Multistream Relay Hub',
    backgroundColor: '#0d1117',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  mainWindow.loadURL('http://127.0.0.1:3000');

  // If initial load encounters temporary connection refused, retry automatically
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.warn(`[TEAstream Desktop] Failed to load (${errorCode}: ${errorDescription}). Retrying in 1s...`);
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL('http://127.0.0.1:3000');
      }
    }, 1000);
  });

  // Open external links (YouTube, Twitch, Kick, etc.) in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Completely terminate all background processes when window is closed
  mainWindow.on('close', () => {
    isQuitting = true;
    stopAllBackgroundProcesses();
  });
}

function stopAllBackgroundProcesses() {
  console.log('[TEAstream Desktop] Terminating all background relays and services...');
  try {
    const relayManager = require('../server/relayManager');
    if (relayManager && typeof relayManager.stopAllRelays === 'function') {
      relayManager.stopAllRelays();
    }
  } catch (e) { }

  const { execSync } = require('child_process');
  const isWin = process.platform === 'win32';
  try {
    if (isWin) {
      execSync('taskkill /F /IM ffmpeg.exe 2>nul', { stdio: 'ignore' });
      const out = execSync('netstat -aon | findstr :3000 | findstr LISTENING', { encoding: 'utf-8' }).trim();
      const lines = out.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid) && pid !== '0' && pid !== String(process.pid)) {
          execSync(`taskkill /F /PID ${pid} 2>nul`, { stdio: 'ignore' });
        }
      }
    } else {
      execSync('pkill -f "ffmpeg" 2>/dev/null', { stdio: 'ignore' });
      execSync('pkill -f "caffeinate -dimsu" 2>/dev/null', { stdio: 'ignore' });
      execSync('pkill -f "node server/index.js" 2>/dev/null', { stdio: 'ignore' });
    }
  } catch (e) { }
}

function stopAllBackgroundProcesses() {
  console.log('[TEAstream Desktop] Terminating all background relays and services...');
  try {
    const relayManager = require('../server/relayManager');
    if (relayManager && typeof relayManager.stopAllRelays === 'function') {
      relayManager.stopAllRelays();
    }
  } catch (e) { }

  const { execSync } = require('child_process');
  const isWin = process.platform === 'win32';
  try {
    if (isWin) {
      execSync('taskkill /F /IM ffmpeg.exe 2>nul', { stdio: 'ignore' });
      const out = execSync('netstat -aon | findstr :3000 | findstr LISTENING', { encoding: 'utf-8' }).trim();
      const lines = out.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid) && pid !== '0' && pid !== String(process.pid)) {
          execSync(`taskkill /F /PID ${pid} 2>nul`, { stdio: 'ignore' });
        }
      }
    } else {
      execSync('pkill -f "ffmpeg" 2>/dev/null', { stdio: 'ignore' });
      execSync('pkill -f "caffeinate -dimsu" 2>/dev/null', { stdio: 'ignore' });
      execSync('pkill -f "node server/index.js" 2>/dev/null', { stdio: 'ignore' });
    }
  } catch (e) { }
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, 'icon.png');
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open TEAstream', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { label: 'Open in Web Browser', click: () => shell.openExternal('http://localhost:3000') },
      { type: 'separator' },
      {
        label: 'Stop Hub & Quit',
        click: () => {
          isQuitting = true;
          stopAllBackgroundProcesses();
          app.quit();
        }
      }
    ]);
    tray.setToolTip('TEAstream — Multistream Relay Hub');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
  } catch (e) {
    // If icon is not available on some OS, tray can be safely skipped
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('ready', async () => {
    await ensureServerRunning();
    createWindow();
    createTray();
  });

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
    stopAllBackgroundProcesses();
    stopAllBackgroundProcesses();
  });
}
