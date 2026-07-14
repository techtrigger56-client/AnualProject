const { getConnection } = require('../db/connection');
const { broadcast } = require('../websocket/wsServer');
const { triggerFireDetection } = require('./securityController');

const SMOKE_THRESHOLD = 300; // valor de referência do MQ-2; ajustar após calibração real

function recordReading(req, res) {
  const { deviceLocation, temperature, humidity, smokeLevel } = req.body;
  if (!deviceLocation) {
    return res.status(400).json({ error: 'deviceLocation é obrigatório.' });
  }

  const db = getConnection();
  db.prepare(
    `INSERT INTO environment_readings (device_location, temperature, humidity, smoke_level)
     VALUES (?, ?, ?, ?)`
  ).run(deviceLocation, temperature ?? null, humidity ?? null, smokeLevel ?? null);

  broadcast('leitura_ambiente', { deviceLocation, temperature, humidity, smokeLevel });

  if (typeof smokeLevel === 'number' && smokeLevel >= SMOKE_THRESHOLD) {
    triggerFireDetection(deviceLocation, smokeLevel).catch((err) =>
      console.error('Falha ao processar deteção de incêndio:', err)
    );
  }

  res.status(201).json({ status: 'registado' });
}

function getReadings(req, res) {
  const { limit = 50 } = req.query;
  const db = getConnection();
  res.json(db.prepare('SELECT * FROM environment_readings ORDER BY timestamp DESC LIMIT ?').all(Number(limit)));
}

module.exports = { recordReading, getReadings };
