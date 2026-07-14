const { DatabaseSync } = require('node:sqlite');
const env = require('../config/env');

let db = null;

function getConnection() {
  if (!db) {
    db = new DatabaseSync(env.dbPath);
    db.exec('PRAGMA foreign_keys = ON;');
  }
  return db;
}

module.exports = { getConnection };
