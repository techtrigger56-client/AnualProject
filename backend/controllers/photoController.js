const path = require('node:path');
const fs = require('node:fs');
const { getConnection } = require('../db/connection');
const { broadcast } = require('../websocket/wsServer');

const PHOTOS_DIR = path.join(__dirname, '..', 'storage', 'photos');

function ensurePhotosDir() {
  if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

function receivePhoto(req, res) {
  const { imageBase64, triggerReason, relatedCollaboratorId } = req.body;
  if (!imageBase64 || !triggerReason) {
    return res.status(400).json({ error: 'imageBase64 e triggerReason são obrigatórios.' });
  }

  ensurePhotosDir();
  const filename = `${Date.now()}_${triggerReason}.jpg`;
  fs.writeFileSync(path.join(PHOTOS_DIR, filename), Buffer.from(imageBase64, 'base64'));

  const db = getConnection();
  db.prepare(
    `INSERT INTO photos (filename, trigger_reason, related_collaborator_id) VALUES (?, ?, ?)`
  ).run(filename, triggerReason, relatedCollaboratorId ?? null);

  broadcast('nova_foto', { filename, triggerReason });
  res.status(201).json({ status: 'foto guardada', filename });
}

function listPhotos(req, res) {
  const { limit = 30 } = req.query;
  const db = getConnection();
  res.json(db.prepare('SELECT * FROM photos ORDER BY captured_at DESC LIMIT ?').all(Number(limit)));
}

module.exports = { receivePhoto, listPhotos };
