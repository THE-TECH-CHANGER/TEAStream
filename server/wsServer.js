const { WebSocketServer } = require('ws');
const relayManager = require('./relayManager');
const storage = require('./storage');

let wss = null;

function setupWebSocket(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    // Send immediate state snapshot
    ws.send(JSON.stringify({
      type: 'INIT_STATE',
      data: {
        server: storage.getConfig().server,
        status: relayManager.getLiveStatus()
      }
    }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch (e) {
        // ignore
      }
    });
  });

  // Wire up relayManager callbacks
  relayManager.setCallbacks({
    onStatusChange: (status) => {
      broadcast({
        type: 'STATUS_UPDATE',
        data: status
      });
    },
    onLogMessage: (log) => {
      broadcast({
        type: 'LOG_MESSAGE',
        data: log
      });
    }
  });

  // Periodic heartbeat broadcast every 2s
  setInterval(() => {
    if (wss && wss.clients.size > 0) {
      broadcast({
        type: 'HEARTBEAT',
        data: relayManager.getLiveStatus()
      });
    }
  }, 2000);

  return wss;
}

function broadcast(payload) {
  if (!wss) return;
  const msg = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(msg);
    }
  });
}

module.exports = {
  setupWebSocket,
  broadcast
};
