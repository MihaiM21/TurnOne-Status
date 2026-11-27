/**
 * Single shared SQLite handle (built-in node:sqlite). Stashed on globalThis so
 * dev HMR never opens the file twice.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const g = globalThis as unknown as { __t1StatusDb?: DatabaseSync; __t1StatusDbPath?: string };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id TEXT NOT NULL,
  t INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  status TEXT NOT NULL,
  latency_ms INTEGER,
  reason TEXT,
  version TEXT,
  subchecks_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_checks_component_t ON checks (component_id, t);

CREATE TABLE IF NOT EXISTS daily_rollups (
  component_id TEXT NOT NULL,
  day TEXT NOT NULL,
  total_s REAL NOT NULL,
  degraded_s REAL NOT NULL,
  down_s REAL NOT NULL,
  worst TEXT NOT NULL,
  p50_ms INTEGER,
  p95_ms INTEGER,
  PRIMARY KEY (component_id, day)
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  impact TEXT NOT NULL,
  state TEXT NOT NULL,
  components_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  automatic INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS incident_updates (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  state TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_updates_incident ON incident_updates (incident_id, created_at);

CREATE TABLE IF NOT EXISTS maintenance (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  state TEXT NOT NULL,
  component_ids_json TEXT NOT NULL,
  scheduled_start INTEGER NOT NULL,
  scheduled_end INTEGER NOT NULL
);
`;

export function dataDir(): string {
  return path.resolve(process.env.DATA_DIR ?? "./data");
}

export function getDb(): DatabaseSync {
  const file = path.join(dataDir(), "status.db");
  if (g.__t1StatusDb && g.__t1StatusDbPath === file) return g.__t1StatusDb;
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  g.__t1StatusDb = db;
  g.__t1StatusDbPath = file;
  return db;
}
