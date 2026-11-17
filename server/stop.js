#!/usr/bin/env node
/**
 * 🍵 TEAstream — Cross-Platform Stop Command
 * Works on macOS, Windows, and Linux.
 * Gracefully halts all background relays, RTMP ingest, and server processes.
 */

const http = require('http');
const { execSync } = require('child_process');

console.log('');
console.log('==============================================================');
console.log('  🍵 TEAstream — Stopping Server & Background Processes');
console.log('==============================================================');

function tryHttpShutdown(port = 3000) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: port,
        path: '/api/server/shutdown',
        method: 'POST',
        timeout: 1500
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('[✓] Graceful shutdown signal acknowledged by TEAstream hub.');
          resolve(true);
        });
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  const isWin = process.platform === 'win32';

  // 1. Send HTTP graceful shutdown signal
  const acknowledged = await tryHttpShutdown(3000);
  if (acknowledged) {
    await new Promise(r => setTimeout(r, 800));
  }

  // 2. Kill any lingering FFmpeg relay workers
  try {
    if (isWin) {
      execSync('taskkill /F /IM ffmpeg.exe 2>nul', { stdio: 'ignore' });
    } else {
      execSync('pkill -f "ffmpeg" 2>/dev/null', { stdio: 'ignore' });
    }
    console.log('[✓] Terminated all active FFmpeg relay streams.');
  } catch (e) {}

  // 3. Kill Node server processes if still alive
  try {
    if (isWin) {
      // Find PID on port 3000 or 1935
      const out = execSync('netstat -aon | findstr :3000 | findstr LISTENING', { encoding: 'utf-8' }).trim();
      const lines = out.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid) && pid !== '0') {
          execSync(`taskkill /F /PID ${pid} 2>nul`, { stdio: 'ignore' });
        }
      }
    } else {
      execSync('pkill -f "node server/index.js" 2>/dev/null', { stdio: 'ignore' });
      execSync('pkill -f "caffeinate.*node server/index.js" 2>/dev/null', { stdio: 'ignore' });
    }
    console.log('[✓] Stopped TEAstream server process.');
  } catch (e) {}

  // 4. On macOS, clear any caffeinate assertions
  if (process.platform === 'darwin') {
    try {
      execSync('pkill -f "caffeinate -dimsu" 2>/dev/null', { stdio: 'ignore' });
      console.log('[✓] Released macOS caffeinate sleep lock (Mac can sleep normally).');
    } catch (e) {}
  }

  console.log('[✓] All TEAstream background processes stopped.');
  console.log('==============================================================');
  console.log('');
  process.exit(0);
}

main();
