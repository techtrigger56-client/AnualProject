const bcrypt = require('bcryptjs');
const { getConnection } = require('../db/connection');
const { signToken } = require('../utils/jwt');

function login(req, res) {
  const { rfidUid, password } = req.body;
  if (!rfidUid || !password) {
    return res.status(400).json({ error: 'rfidUid e password são obrigatórios.' });
  }

  const db = getConnection();
  const collaborator = db
    .prepare('SELECT * FROM collaborators WHERE rfid_uid = ? AND active = 1')
    .get(rfidUid);

  if (!collaborator || !bcrypt.compareSync(password, collaborator.password_hash)) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const token = signToken({ id: collaborator.id, role: collaborator.role });
  res.json({ token, collaborator: { id: collaborator.id, name: collaborator.name, role: collaborator.role } });
}

module.exports = { login };
