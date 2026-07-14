const fs = require('node:fs');
const path = require('node:path');
const { getConnection } = require('./connection');
const { DOOR_RELAY } = require('../services/relayService');

function migrate() {
  const db = getConnection();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  // Sem isto, o primeiro toggle real assumia um estado adivinhado.
  // Agora arranca sempre "trancado" (ligado) — primeira credencial válida abre.
  db.prepare(
    `INSERT INTO relay_states (relay_name, state) VALUES (?, 'ligado')
     ON CONFLICT(relay_name) DO NOTHING`
  ).run(DOOR_RELAY);

  console.log('Migração concluída com sucesso.');
}

migrate();
