const bcrypt = require('bcryptjs');
const { getConnection } = require('../db/connection');
const { countActiveAdmins } = require('../services/adminGuard');

const SALT_ROUNDS = 10;

function createCollaborator(req, res) {
  const { name, rfidUid, password, role } = req.body;
  if (!name || !rfidUid || !password || !role) {
    return res.status(400).json({ error: 'name, rfidUid, password e role são obrigatórios.' });
  }
  if (!['admin', 'worker'].includes(role)) {
    return res.status(400).json({ error: "role tem de ser 'admin' ou 'worker'." });
  }
  if (role === 'admin' && countActiveAdmins() >= 1) {
    return res.status(409).json({ error: 'Já existe um administrador ativo. Só é permitido um admin no sistema.' });
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const db = getConnection();

  try {
    const result = db
      .prepare('INSERT INTO collaborators (name, rfid_uid, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(name, rfidUid, passwordHash, role);
    res.status(201).json({ id: result.lastInsertRowid, name, role });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Já existe um colaborador com este rfidUid.' });
    }
    throw err;
  }
}

function listCollaborators(req, res) {
  const db = getConnection();
  res.json(db.prepare('SELECT id, name, rfid_uid, role, active, created_at FROM collaborators').all());
}

function deactivateCollaborator(req, res) {
  const { id } = req.params;
  const db = getConnection();
  const collaborator = db.prepare('SELECT * FROM collaborators WHERE id = ?').get(id);

  if (!collaborator) {
    return res.status(404).json({ error: 'Colaborador não encontrado.' });
  }
  if (collaborator.role === 'admin' && countActiveAdmins(id) === 0) {
    return res.status(409).json({ error: 'Não é possível desativar o único administrador ativo do sistema.' });
  }

  db.prepare('UPDATE collaborators SET active = 0 WHERE id = ?').run(id);
  res.json({ status: 'desativado' });
}

function updateOwnProfile(req, res) {
  const { currentPassword, newName, newPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({ error: 'currentPassword é obrigatório para confirmar a alteração.' });
  }
  if (!newName && !newPassword) {
    return res.status(400).json({ error: 'Fornece newName e/ou newPassword.' });
  }

  const db = getConnection();
  const collaborator = db.prepare('SELECT * FROM collaborators WHERE id = ?').get(req.user.id);

  if (!collaborator || !bcrypt.compareSync(currentPassword, collaborator.password_hash)) {
    return res.status(401).json({ error: 'Password atual incorreta.' });
  }

  const name = newName || collaborator.name;
  const passwordHash = newPassword ? bcrypt.hashSync(newPassword, 10) : collaborator.password_hash;

  db.prepare('UPDATE collaborators SET name = ?, password_hash = ? WHERE id = ?')
    .run(name, passwordHash, req.user.id);

  res.json({ status: 'perfil atualizado', name });
}

function updateCollaborator(req, res) {
  const { id } = req.params;
  const { name, role, newPassword } = req.body;

  if (role && !['admin', 'worker'].includes(role)) {
    return res.status(400).json({ error: "role tem de ser 'admin' ou 'worker'." });
  }

  const db = getConnection();
  const collaborator = db.prepare('SELECT * FROM collaborators WHERE id = ?').get(id);

  if (!collaborator) {
    return res.status(404).json({ error: 'Colaborador não encontrado.' });
  }

  // Promover outro colaborador a admin, quando já existe um admin ativo diferente deste.
  if (role === 'admin' && collaborator.role !== 'admin' && countActiveAdmins() >= 1) {
    return res.status(409).json({ error: 'Já existe um administrador ativo. Só é permitido um admin no sistema.' });
  }
  // Rebaixar o único admin ativo, sem substituto.
  if (collaborator.role === 'admin' && role === 'worker' && countActiveAdmins(id) === 0) {
    return res.status(409).json({ error: 'Não é possível rebaixar o único administrador ativo do sistema.' });
  }

  const updatedName = name || collaborator.name;
  const updatedRole = role || collaborator.role;
  const updatedHash = newPassword ? bcrypt.hashSync(newPassword, 10) : collaborator.password_hash;

  db.prepare('UPDATE collaborators SET name = ?, role = ?, password_hash = ? WHERE id = ?')
    .run(updatedName, updatedRole, updatedHash, id);

  res.json({ id: Number(id), name: updatedName, role: updatedRole });
}

module.exports = {
  createCollaborator,
  listCollaborators,
  deactivateCollaborator,
  updateOwnProfile,
  updateCollaborator,
};