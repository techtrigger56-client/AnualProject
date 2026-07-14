const { getConnection } = require('../db/connection');

function hasActiveFireEvent() {
  const db = getConnection();
  return Boolean(
    db.prepare("SELECT 1 FROM security_events WHERE type = 'incendio' AND resolved = 0 LIMIT 1").get()
  );
}

module.exports = { hasActiveFireEvent };
