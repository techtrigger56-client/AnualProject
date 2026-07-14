const { WebSocketServer } = require('ws');

let wss = null;

function initWebSocket(httpServer) {
  wss = new WebSocketServer({ server: httpServer });
  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'conexao', message: 'Ligado ao Smart Enterprise System' }));
  });
  return wss;
}

function broadcast(type, payload) {
  if (!wss) return;
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(message);
  });
}

module.exports = { initWebSocket, broadcast };
