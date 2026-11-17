const NodeMediaServer = require('node-media-server');
const os = require('os');
const path = require('path');
const storage = require('./storage');
const relayManager = require('./relayManager');

let nmsInstance = null;

function createNMS() {
  const config = storage.getConfig();
  const rtmpPort = config.server.rtmpPort || 1935;
  const httpPort = config.server.httpPort || 8000;

  const nmsConfig = {
    logType: 2, // 1: error, 2: info, 3: debug
    rtmp: {
      port: rtmpPort,
      chunk_size: 4096,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60
    },
    http: {
      port: httpPort,
      allow_origin: '*',
      mediaroot: path.join(os.tmpdir(), 'teastream-media')
    }
  };

  const nms = new NodeMediaServer(nmsConfig);

  // Authentication & Ingest lifecycle
  nms.on('prePublish', (id, StreamPath, args) => {
    const expectedKey = storage.getConfig().server.ingestKey;
    const parts = StreamPath.split('/').filter(Boolean);
    // Format: /live/{streamKey}
    const streamKey = parts[1];

    console.log(`[RTMP Ingest] Publish request for path: ${StreamPath}`);

    if (expectedKey && streamKey !== expectedKey) {
      console.warn(`[RTMP Ingest] Unauthorized stream key attempt: "${streamKey}". Expected: "${expectedKey}"`);
      const session = nms.getSession(id);
      if (session) {
        session.reject();
      }
      return;
    }

    console.log(`[RTMP Ingest] Authorized stream session #${id} approved.`);
  });

  nms.on('postPublish', (id, StreamPath, args) => {
    const parts = StreamPath.split('/').filter(Boolean);
    const streamKey = parts[1];
    relayManager.startIngest(streamKey);
  });

  nms.on('donePublish', (id, StreamPath, args) => {
    console.log(`[RTMP Ingest] Stream closed on path: ${StreamPath}`);
    relayManager.stopIngest();

    const currentConfig = storage.getConfig();
    if (currentConfig.server && currentConfig.server.autoShutdownOnStreamEnd) {
      console.log('[RTMP Ingest] Auto-shutdown is enabled. Stream ended. Initiating shutdown in 5 seconds unless reconnected...');
      setTimeout(() => {
        if (!relayManager.isIngesting) {
          console.log('[RTMP Ingest] Stream ended and no new stream. Auto-stopping TEAstream server now.');
          process.emit('SIGINT');
        }
      }, 5000);
    }
  });

  nmsInstance = nms;
  return nms;
}

function getNMS() {
  return nmsInstance;
}

module.exports = {
  createNMS,
  getNMS
};
