const fs = require('fs');
const path = require('path');
const os = require('os');
const defaultDestinations = require('./defaultDestinations');

function resolveDataDirectory() {
  // 1. If running inside Electron:
  if (process.versions && process.versions.electron) {
    try {
      const electron = require('electron');
      const app = electron.app || (electron.remote && electron.remote.app);
      if (app && typeof app.getPath === 'function') {
        const userDir = path.join(app.getPath('userData'), 'data');
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
        return userDir;
      }
    } catch (e) {}
  }

  // 2. If DATA_DIR environment variable is set:
  if (process.env.DATA_DIR) {
    if (!fs.existsSync(process.env.DATA_DIR)) fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
    return process.env.DATA_DIR;
  }

  // 3. Project data directory:
  const localDir = path.join(__dirname, '../data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const testFile = path.join(localDir, '.write_test');
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    return localDir;
  } catch (e) {
    // 4. Fallback to user home directory ~/.teastream/data
    const homeDir = path.join(os.homedir(), '.teastream', 'data');
    if (!fs.existsSync(homeDir)) {
      fs.mkdirSync(homeDir, { recursive: true });
    }
    return homeDir;
  }
}

const DATA_DIR = resolveDataDirectory();
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
  server: {
    rtmpPort: 1935,
    httpPort: 8000,
    webPort: 3000,
    ingestKey: 'cstream_live_' + Math.random().toString(36).substring(2, 10),
    autoStartRelay: true,
    autoShutdownOnStreamEnd: false
  },
  destinations: defaultDestinations
};

class Storage {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Merge with defaults to ensure all 9 platforms exist if config was older
        const mergedDestinations = DEFAULT_CONFIG.destinations.map(def => {
          const existing = parsed.destinations?.find(d => d.id === def.id);
          return existing ? { ...def, ...existing } : def;
        });

        // Add any custom destinations that user might have added
        if (parsed.destinations) {
          const custom = parsed.destinations.filter(d => !DEFAULT_CONFIG.destinations.some(def => def.id === d.id));
          mergedDestinations.push(...custom);
        }

        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          server: {
            ...DEFAULT_CONFIG.server,
            ...(parsed.server || {})
          },
          destinations: mergedDestinations
        };
      } else {
        const exampleFile = path.join(__dirname, '../data/config.example.json');
        if (fs.existsSync(exampleFile)) {
          try {
            const raw = fs.readFileSync(exampleFile, 'utf-8');
            const parsed = JSON.parse(raw);
            const initial = {
              ...DEFAULT_CONFIG,
              ...parsed,
              server: { ...DEFAULT_CONFIG.server, ...(parsed.server || {}) }
            };
            this.saveConfig(initial);
            return initial;
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('[Storage] Error reading config file, falling back to defaults:', err.message);
    }

    this.saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  saveConfig(newConfig) {
    try {
      this.config = newConfig;
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[Storage] Failed to save config file:', err.message);
      return false;
    }
  }

  getConfig() {
    this.config = this.loadConfig();
    return this.config;
  }

  updateDestination(id, updates) {
    const dest = this.config.destinations.find(d => d.id === id);
    if (!dest) return null;

    Object.assign(dest, updates);
    this.saveConfig(this.config);
    return dest;
  }

  toggleDestination(id, enabled) {
    return this.updateDestination(id, { enabled });
  }

  setStreamKey(id, streamKey) {
    return this.updateDestination(id, { streamKey });
  }

  resetDestination(id) {
    const defaultDest = defaultDestinations.find(d => d.id === id);
    if (!defaultDest) return null;
    return this.updateDestination(id, {
      serverUrl: defaultDest.serverUrl,
      guideUrl: defaultDest.guideUrl
    });
  }

  updateServerConfig(updates) {
    Object.assign(this.config.server, updates);
    this.saveConfig(this.config);
    return this.config.server;
  }
}

module.exports = new Storage();
