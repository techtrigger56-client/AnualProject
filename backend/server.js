const express = require('express');
const http = require('node:http');
const path = require('node:path');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const { initWebSocket } = require('./websocket/wsServer');
const { getConnection } = require('./db/connection');

const authRoutes = require('./routes/authRoutes');
const collaboratorRoutes = require('./routes/collaboratorRoutes');
const accessRoutes = require('./routes/accessRoutes');
const environmentRoutes = require('./routes/environmentRoutes');
const securityRoutes = require('./routes/securityRoutes');
const photoRoutes = require('./routes/photoRoutes');
const relayRoutes = require('./routes/relayRoutes');

const app = express();
app.use(express.json({ limit: '5mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/environment', environmentRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/relays', relayRoutes);

app.use(
  '/api/photo-files',
  authenticate,
  express.static(path.join(__dirname, 'storage', 'photos'))
);

// Dashboard servida pelo próprio Express — mesma origem que a API,
// elimina qualquer problema de CORS entre frontend e backend.
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));

app.use(errorHandler);

const server = http.createServer(app);
initWebSocket(server);

server.listen(env.port, () => {
  console.log(`Servidor HTTP + WebSocket a correr em http://localhost:${env.port}`);
  console.log(`Dashboard disponível em http://localhost:${env.port}/dashboard/login.html`);
});

function shutdown(signal) {
  console.log(`\n${signal} recebido. A encerrar...`);
  server.close(() => {
    getConnection().close();
    console.log('Servidor e BD encerrados com segurança.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
