const bcrypt = require('bcryptjs');
const { getConnection } = require('../db/connection');
const { sendRelayCommand } = require('../services/esp32Service');
const { broadcast } = require('../websocket/wsServer');
const { hasActiveFireEvent } = require('../services/securityState');
const { getRelayState, setRelayState, DOOR_RELAY } = require('../services/relayService');

async function toggleAccess(req, res) {
  const { rfidUid, password, deviceLocation } = req.body;
  if (!rfidUid || !password || !deviceLocation) {
    return res.status(400).json({ error: 'rfidUid, password e deviceLocation são obrigatórios.' });
  }

  if (hasActiveFireEvent()) {
    return res.status(423).json({
      error: 'Acesso bloqueado: evento de incêndio ativo. Fechadura em modo fail-safe (destrancada).',
    });
  }

  const db = getConnection();
  const collaborator = db
    .prepare('SELECT * FROM collaborators WHERE rfid_uid = ? AND active = 1')
    .get(rfidUid);

  const logAttempt = (success, collaboratorId = null, action = 'fechar') => {
    db.prepare(
      `INSERT INTO access_logs (collaborator_id, device_location, action, method, success)
       VALUES (?, ?, ?, 'rfid+password', ?)`
    ).run(collaboratorId, deviceLocation, action, success ? 1 : 0);
  };

  if (!collaborator || !bcrypt.compareSync(password, collaborator.password_hash)) {
    logAttempt(false);
    return res.status(401).json({ error: 'RFID ou password inválidos.' });
  }

  const current = getRelayState(DOOR_RELAY);
  const newState = current?.state === 'ligado' ? 'desligado' : 'ligado';
  const action = newState === 'desligado' ? 'abrir' : 'fechar';

  setRelayState(DOOR_RELAY, newState, collaborator.id);
  logAttempt(true, collaborator.id, action);

  await sendRelayCommand(DOOR_RELAY, newState);

  broadcast('acesso_alterado', { deviceLocation, action, collaborator: { id: collaborator.id, name: collaborator.name } });
  res.json({ deviceLocation, action, relayState: newState });
}

function getLogs(req, res) {
  const { limit = 20 } = req.query;
  const db = getConnection();
  res.json(db.prepare('SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT ?').all(Number(limit)));
}

module.exports = { toggleAccess, getLogs };
