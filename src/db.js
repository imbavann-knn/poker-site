const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Use /data volume on Railway (persistent), fallback to local for dev
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'wholesome.db');
console.log('🗃️  SQLite DB at:', DB_PATH);

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// ——— Schema ———
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    alias TEXT,
    emoji TEXT DEFAULT '♠',
    joined_date TEXT DEFAULT (date('now')),
    created_by TEXT DEFAULT 'System',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    date TEXT NOT NULL,
    time TEXT DEFAULT '20:00',
    venue TEXT,
    host TEXT,
    blinds TEXT DEFAULT '0.10/0.20',
    status TEXT DEFAULT 'planned',
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS session_attendance (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    added_by TEXT,
    added_at TEXT DEFAULT (datetime('now')),
    UNIQUE(session_id, player_id)
  );

  CREATE TABLE IF NOT EXISTS session_results (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    profit_loss REAL NOT NULL DEFAULT 0,
    entered_by TEXT,
    entered_at TEXT DEFAULT (datetime('now')),
    UNIQUE(session_id, player_id)
  );

  CREATE TABLE IF NOT EXISTS changelog (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    editor_name TEXT NOT NULL,
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log('✅ SQLite schema ready');

// Wrap SQLite in a pg-compatible async query interface
const db = {
  query: async (sql, params = []) => {
    try {
      // Detect query type
      const trimmed = sql.trim().toUpperCase();

      // SQLite uses ? for params, Postgres uses $1, $2 etc. — convert
      let converted = sql.replace(/\$(\d+)/g, '?');

      // SQLite doesn't support gen_random_uuid() — not needed (schema uses randomblob)
      // SQLite doesn't support NOW() — replace with datetime('now')
      converted = converted.replace(/NOW\(\)/gi, "datetime('now')");
      converted = converted.replace(/CURRENT_DATE/gi, "date('now')");
      converted = converted.replace(/TIMESTAMPTZ/gi, 'TEXT');
      converted = converted.replace(/JSONB/gi, 'TEXT');

      // JSON params need to be stringified for JSONB columns
      const processedParams = params.map(p =>
        (typeof p === 'object' && p !== null) ? JSON.stringify(p) : p
      );

      if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
        const stmt = sqlite.prepare(converted);
        const rows = stmt.all(...processedParams);
        // Parse JSON fields back
        const parsed = rows.map(row => {
          const r = { ...row };
          ['old_value', 'new_value'].forEach(k => {
            if (r[k] && typeof r[k] === 'string') {
              try { r[k] = JSON.parse(r[k]); } catch (_) {}
            }
          });
          return r;
        });
        return { rows: parsed };
      } else if (trimmed.startsWith('INSERT') && / RETURNING /i.test(sql)) {
        // Handle INSERT...RETURNING (not supported in SQLite directly)
        const insertSql = converted.replace(/ RETURNING .*/i, '');
        const returnCols = sql.match(/RETURNING (.+)$/i)?.[1]?.trim() || '*';

        // For INSERT with ON CONFLICT DO NOTHING, handle separately
        const stmt = sqlite.prepare(insertSql);
        const info = stmt.run(...processedParams);

        if (info.changes === 0) return { rows: [] };

        // Fetch the inserted row
        let tableName = sql.match(/INTO (\w+)/i)?.[1] || '';
        if (tableName) {
          const fetchSql = returnCols === '*'
            ? `SELECT * FROM ${tableName} WHERE rowid = ?`
            : `SELECT ${returnCols} FROM ${tableName} WHERE rowid = ?`;
          try {
            const row = sqlite.prepare(fetchSql).get(info.lastInsertRowid);
            return { rows: row ? [row] : [] };
          } catch (_) {}
        }
        return { rows: [] };
      } else {
        const stmt = sqlite.prepare(converted);
        stmt.run(...processedParams);
        return { rows: [] };
      }
    } catch (err) {
      console.error('DB query error:', err.message, '\nSQL:', sql.slice(0, 120));
      throw err;
    }
  },
};

module.exports = db;
