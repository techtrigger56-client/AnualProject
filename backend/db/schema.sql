PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS collaborators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rfid_uid TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'worker')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collaborator_id INTEGER REFERENCES collaborators(id),
  device_location TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('abrir', 'fechar')),
  method TEXT NOT NULL DEFAULT 'rfid+password',
  success INTEGER NOT NULL DEFAULT 1,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS environment_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_location TEXT NOT NULL,
  temperature REAL,
  humidity REAL,
  smoke_level REAL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('incendio', 'lockdown', 'evacuacao', 'intrusao')),
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'critico' CHECK (severity IN ('info', 'aviso', 'critico')),
  triggered_by INTEGER REFERENCES collaborators(id),
  resolved INTEGER NOT NULL DEFAULT 0,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  trigger_reason TEXT NOT NULL CHECK (trigger_reason IN ('acesso', 'evento_seguranca', 'manual')),
  related_collaborator_id INTEGER REFERENCES collaborators(id),
  captured_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS relay_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  relay_name TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('ligado', 'desligado')),
  updated_by INTEGER REFERENCES collaborators(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
