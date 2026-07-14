const { getConnection } = require('../db/connection');

function countActiveAdmins(excludeId = null) {
  const db = getConnection();
  const rows = db
    .prepare("SELECT id FROM collaborators WHERE role = 'admin' AND active = 1")
    .all();
  return excludeId ? rows.filter((r) => r.id !== Number(excludeId)).length : rows.length;
}

module.exports = { countActiveAdmins };