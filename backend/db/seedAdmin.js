const bcrypt = require('bcryptjs');
const { getConnection } = require('./connection');

const [, , rfidUid, password, name] = process.argv;

if (!rfidUid || !password || !name) {
  console.error('Uso: node db/seedAdmin.js <rfidUid> <password> <nome>');
  process.exit(1);
}

const db = getConnection();
const passwordHash = bcrypt.hashSync(password, 10);

try {
  db.prepare(
    `INSERT INTO collaborators (name, rfid_uid, password_hash, role) VALUES (?, ?, ?, 'admin')`
  ).run(name, rfidUid, passwordHash);
  console.log(`Admin "${name}" criado com sucesso. Já podes fazer login em /api/auth/login.`);
} catch (err) {
  if (err.message.includes('UNIQUE')) {
    console.error('Já existe um colaborador com este rfidUid.');
  } else {
    console.error(err.message);
  }
  process.exit(1);
}
