import fs from 'fs';
import initSqlJs from 'sql.js';

const DB_FILE = process.env.DB_FILE || 'data.db';

const SQL = await initSqlJs();
const db = fs.existsSync(DB_FILE)
  ? new SQL.Database(fs.readFileSync(DB_FILE))
  : new SQL.Database();

// sql.js keeps everything in memory, so write it out after each transaction.
// (We skip PRAGMA foreign_keys because db.export() resets pragmas.)
function persist() {
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
}

export function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function execute(sql, params = []) {
  db.run(sql, params);
}

export function lastInsertId() {
  return query('SELECT last_insert_rowid() AS id')[0].id;
}

export function transaction(work) {
  db.run('BEGIN');
  try {
    const result = work();
    db.run('COMMIT');
    persist();
    return result;
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT
  );
  CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY,
    name TEXT
  );
  CREATE TABLE IF NOT EXISTS members (
    workspace_id INTEGER,
    user_id INTEGER,
    role TEXT,
    PRIMARY KEY (workspace_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY,
    workspace_id INTEGER,
    title TEXT,
    status TEXT DEFAULT 'TODO',
    priority TEXT DEFAULT 'MEDIUM',
    created_by INTEGER,
    updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY,
    workspace_id INTEGER,
    task_id INTEGER,
    user_id INTEGER,
    action TEXT,
    detail TEXT,
    created_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks (workspace_id, status, priority);
  CREATE INDEX IF NOT EXISTS idx_logs_workspace ON activity_logs (workspace_id, id);
`);
