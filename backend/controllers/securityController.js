const { getConnection } = require('../db/connection');
const { broadcast } = require('../websocket/wsServer');
const { sendRelayCommand, requestPhotoCapture } = require('../services/esp32Service');
const { getAllDoorRelays, setRelayState } = require('../services/relayService');
const { hasActiveFireEvent } = require('../services/securityState');

async function triggerFireDetection(deviceLocation, smokeLevel) {
  const db = getConnection();
  db.prepare(
    `INSERT INTO security_events (type, description, severity) VALUES ('incendio', ?, 'critico')`
  ).run(`Deteção de fumo/incêndio em ${deviceLocation} (nível: ${smokeLevel})`);

  for (const relay of getAllDoorRelays()) {
    setRelayState(relay, 'desligado', null); // fail-safe: destranca tudo
    await sendRelayCommand(relay, 'desligado');
  }

  await requestPhotoCapture('evento_seguranca');
  broadcast('evento_seguranca', { type: 'incendio', deviceLocation, smokeLevel });
}

function triggerLockdown(req, res) {
  if (hasActiveFireEvent()) {
    return res.status(409).json({ error: 'Não é possível ativar lockdown com um incêndio ativo.' });
  }

  const db = getConnection();
  db.prepare(
    `INSERT INTO security_events (type, description, severity, triggered_by)
     VALUES ('lockdown', 'Lockdown ativado manualmente', 'critico', ?)`
  ).run(req.user.id);

  getAllDoorRelays().forEach((relay) => {
    setRelayState(relay, 'ligado', req.user.id);
    sendRelayCommand(relay, 'ligado'); // fire-and-forget: já trata os próprios erros
  });

  broadcast('evento_seguranca', { type: 'lockdown', triggeredBy: req.user.id });
  res.json({ status: 'lockdown ativado' });
}

function triggerEvacuation(req, res) {
  const db = getConnection();
  db.prepare(
    `INSERT INTO security_events (type, description, severity, triggered_by)
     VALUES ('evacuacao', 'Evacuação ativada manualmente', 'critico', ?)`
  ).run(req.user.id);

  getAllDoorRelays().forEach((relay) => {
    setRelayState(relay, 'desligado', req.user.id);
    sendRelayCommand(relay, 'desligado');
  });

  broadcast('evento_seguranca', { type: 'evacuacao', triggeredBy: req.user.id });
  res.json({ status: 'evacuação ativada' });
}

function resolveEvent(req, res) {
  const { eventId } = req.params;
  const db = getConnection();
  const result = db
    .prepare("UPDATE security_events SET resolved = 1, resolved_at = datetime('now') WHERE id = ?")
    .run(eventId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }
  broadcast('evento_resolvido', { eventId: Number(eventId) });
  res.json({ status: 'resolvido' });
}

function getEvents(req, res) {
  const db = getConnection();
  res.json(db.prepare('SELECT * FROM security_events ORDER BY created_at DESC').all());
}

module.exports = { triggerFireDetection, triggerLockdown, triggerEvacuation, resolveEvent, getEvents };
