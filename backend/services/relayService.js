const { getConnection } = require('../db/connection');

const DOOR_RELAY = 'fechadura_principal';

function getAllDoorRelays() {
  // Para múltiplas portas no futuro, listar todos os relés aqui.
  return [DOOR_RELAY];
}

function getRelayState(relayName) {
  const db = getConnection();
  return db.prepare('SELECT * FROM relay_states WHERE relay_name = ?').get(relayName);
}

function setRelayState(relayName, state, updatedBy) {
  const db = getConnection();
  db.prepare(
    `INSERT INTO relay_states (relay_name, state, updated_by)
     VALUES (?, ?, ?)
     ON CONFLICT(relay_name) DO UPDATE SET
       state = excluded.state,
       updated_by = excluded.updated_by,
       updated_at = datetime('now')`
  ).run(relayName, state, updatedBy);
}

module.exports = { DOOR_RELAY, getAllDoorRelays, getRelayState, setRelayState };
