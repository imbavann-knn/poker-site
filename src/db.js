// =============================================
// Wholesome ALL IN — JSON File Database
// Pure JS, zero native deps, no SSL headaches
// =============================================
const { LowSync } = require('lowdb');
const { JSONFileSync } = require('lowdb/node');
const path = require('path');
const fs = require('fs');

// Persistent on Railway volume, fallback to local /data dir
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'wholesome.json');
console.log('🗃️  DB at:', DB_FILE);

// Default empty structure
const defaultData = {
  players: [],
  sessions: [],
  session_attendance: [],
  session_results: [],
  changelog: [],
};

const adapter = new JSONFileSync(DB_FILE);
const lowdb = new LowSync(adapter, defaultData);
lowdb.read();

console.log('✅ JSON DB ready —', Object.keys(lowdb.data).map(k => `${k}: ${lowdb.data[k].length}`).join(', '));

// =============================================
// ID generator
// =============================================
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// =============================================
// save helper
// =============================================
function save() {
  lowdb.write();
}

// =============================================
// pg-compatible async query interface
// Maps SQL-like queries to JSON operations
// =============================================
const db = {
  _data: lowdb.data,

  query: async (sql, params = []) => {
    // This db uses direct API methods below — SQL strings not used at runtime
    // This stub exists for health-check compatibility
    return { rows: [{ ok: 1 }] };
  },

  // ——— Players ———
  players: {
    getAll: () => {
      lowdb.read();
      return lowdb.data.players.map(p => {
        const results = lowdb.data.session_results.filter(r => r.player_id === p.id);
        const sessions_played = results.length;
        const total_profit = results.reduce((s, r) => s + r.profit_loss, 0);
        const wins = results.filter(r => r.profit_loss > 0).length;
        const best = results.length ? Math.max(...results.map(r => r.profit_loss)) : 0;
        const worst = results.length ? Math.min(...results.map(r => r.profit_loss)) : 0;
        return { ...p, sessions_played, total_profit, wins, best_session: best, worst_session: worst };
      });
    },
    getById: (id) => {
      lowdb.read();
      const p = lowdb.data.players.find(pl => pl.id === id);
      if (!p) return null;
      const results = lowdb.data.session_results.filter(r => r.player_id === id);
      const sessions = lowdb.data.sessions;
      const sessions_played = results.length;
      const total_profit = results.reduce((s, r) => s + r.profit_loss, 0);
      const wins = results.filter(r => r.profit_loss > 0).length;
      const losses = results.filter(r => r.profit_loss < 0).length;
      const best = results.length ? Math.max(...results.map(r => r.profit_loss)) : 0;
      const worst = results.length ? Math.min(...results.map(r => r.profit_loss)) : 0;
      const history = results.map(r => {
        const s = sessions.find(s => s.id === r.session_id) || {};
        return { profit_loss: r.profit_loss, date: s.date, venue: s.venue, blinds: s.blinds };
      }).sort((a, b) => new Date(b.date) - new Date(a.date));
      return {
        ...p,
        stats: { sessions_played, total_profit, wins, losses, best_session: best, worst_session: worst },
        history,
      };
    },
    create: (data) => {
      lowdb.read();
      const player = { id: genId(), created_at: new Date().toISOString(), ...data };
      lowdb.data.players.push(player);
      save();
      return player;
    },
    update: (id, data) => {
      lowdb.read();
      const idx = lowdb.data.players.findIndex(p => p.id === id);
      if (idx === -1) return null;
      Object.assign(lowdb.data.players[idx], data);
      save();
      return lowdb.data.players[idx];
    },
    delete: (id) => {
      lowdb.read();
      lowdb.data.players = lowdb.data.players.filter(p => p.id !== id);
      save();
    },
  },

  // ——— Sessions ———
  sessions: {
    getAll: (statusFilter) => {
      lowdb.read();
      let sessions = lowdb.data.sessions;
      if (statusFilter) sessions = sessions.filter(s => s.status === statusFilter);
      return sessions.map(s => ({
        ...s,
        attendee_count: lowdb.data.session_attendance.filter(a => a.session_id === s.id).length,
        results_count: lowdb.data.session_results.filter(r => r.session_id === s.id).length,
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    getById: (id) => {
      lowdb.read();
      const s = lowdb.data.sessions.find(s => s.id === id);
      if (!s) return null;
      const attendance = lowdb.data.session_attendance
        .filter(a => a.session_id === id)
        .map(a => {
          const p = lowdb.data.players.find(pl => pl.id === a.player_id) || {};
          return { ...a, name: p.name, alias: p.alias, emoji: p.emoji };
        });
      const results = lowdb.data.session_results
        .filter(r => r.session_id === id)
        .sort((a, b) => b.profit_loss - a.profit_loss)
        .map(r => {
          const p = lowdb.data.players.find(pl => pl.id === r.player_id) || {};
          return { ...r, name: p.name, alias: p.alias, emoji: p.emoji };
        });
      return { ...s, attendance, results };
    },
    create: (data) => {
      lowdb.read();
      const session = { id: genId(), status: 'planned', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data };
      lowdb.data.sessions.push(session);
      save();
      return session;
    },
    update: (id, data) => {
      lowdb.read();
      const idx = lowdb.data.sessions.findIndex(s => s.id === id);
      if (idx === -1) return null;
      Object.assign(lowdb.data.sessions[idx], { ...data, updated_at: new Date().toISOString() });
      save();
      return lowdb.data.sessions[idx];
    },
    delete: (id) => {
      lowdb.read();
      lowdb.data.sessions = lowdb.data.sessions.filter(s => s.id !== id);
      lowdb.data.session_attendance = lowdb.data.session_attendance.filter(a => a.session_id !== id);
      lowdb.data.session_results = lowdb.data.session_results.filter(r => r.session_id !== id);
      save();
    },
  },

  // ——— Attendance ———
  attendance: {
    add: (session_id, player_id, added_by) => {
      lowdb.read();
      const exists = lowdb.data.session_attendance.find(a => a.session_id === session_id && a.player_id === player_id);
      if (exists) return null;
      const entry = { id: genId(), session_id, player_id, added_by, added_at: new Date().toISOString() };
      lowdb.data.session_attendance.push(entry);
      save();
      return entry;
    },
    remove: (session_id, player_id) => {
      lowdb.read();
      lowdb.data.session_attendance = lowdb.data.session_attendance.filter(
        a => !(a.session_id === session_id && a.player_id === player_id)
      );
      save();
    },
  },

  // ——— Results ———
  results: {
    upsert: (session_id, player_id, profit_loss, entered_by) => {
      lowdb.read();
      const idx = lowdb.data.session_results.findIndex(r => r.session_id === session_id && r.player_id === player_id);
      if (idx !== -1) {
        const old = { ...lowdb.data.session_results[idx] };
        lowdb.data.session_results[idx] = { ...old, profit_loss, entered_by, entered_at: new Date().toISOString() };
        save();
        return { old, current: lowdb.data.session_results[idx] };
      } else {
        const entry = { id: genId(), session_id, player_id, profit_loss, entered_by, entered_at: new Date().toISOString() };
        lowdb.data.session_results.push(entry);
        save();
        return { old: null, current: entry };
      }
    },
    delete: (id) => {
      lowdb.read();
      lowdb.data.session_results = lowdb.data.session_results.filter(r => r.id !== id);
      save();
    },
  },

  // ——— Leaderboard ———
  leaderboard: {
    get: (period) => {
      lowdb.read();
      let sessions = lowdb.data.sessions.filter(s => s.status === 'completed');
      if (period === 'ytd') {
        const y = new Date().getFullYear();
        sessions = sessions.filter(s => s.date?.startsWith(y));
      } else if (period === 'monthly') {
        const prefix = new Date().toISOString().slice(0, 7);
        sessions = sessions.filter(s => s.date?.startsWith(prefix));
      }
      const sessionIds = new Set(sessions.map(s => s.id));
      const results = lowdb.data.session_results.filter(r => sessionIds.has(r.session_id));

      const playerMap = {};
      for (const p of lowdb.data.players) {
        playerMap[p.id] = { ...p, sessions_played: 0, total_profit: 0, wins: 0, losses: 0, breakeven: 0, best_session: 0, worst_session: 0 };
      }
      for (const r of results) {
        const p = playerMap[r.player_id];
        if (!p) continue;
        p.sessions_played++;
        p.total_profit += r.profit_loss;
        if (r.profit_loss > 0) p.wins++;
        else if (r.profit_loss < 0) p.losses++;
        else p.breakeven++;
        if (r.profit_loss > p.best_session) p.best_session = r.profit_loss;
        if (r.profit_loss < p.worst_session) p.worst_session = r.profit_loss;
      }

      const leaderboard = Object.values(playerMap)
        .filter(p => p.sessions_played > 0)
        .sort((a, b) => b.total_profit - a.total_profit);

      const allResults = lowdb.data.session_results;
      const total_pot_moved = allResults.reduce((s, r) => s + Math.abs(r.profit_loss), 0) / 2;
      const biggest_win = allResults.length ? Math.max(...allResults.map(r => r.profit_loss)) : 0;
      const biggest_loss = allResults.length ? Math.min(...allResults.map(r => r.profit_loss)) : 0;

      return {
        leaderboard,
        groupStats: {
          total_sessions: lowdb.data.sessions.filter(s => s.status === 'completed').length,
          total_players: lowdb.data.players.length,
          total_pot_moved,
          biggest_win,
          biggest_loss,
        },
      };
    },
  },

  // ——— Changelog ———
  changelog: {
    add: (action, entity_type, entity_id, editor_name, description, old_value, new_value) => {
      lowdb.read();
      const entry = { id: genId(), action, entity_type, entity_id, editor_name, description, old_value, new_value, created_at: new Date().toISOString() };
      lowdb.data.changelog.unshift(entry);
      // Keep last 500 entries
      if (lowdb.data.changelog.length > 500) lowdb.data.changelog = lowdb.data.changelog.slice(0, 500);
      save();
      return entry;
    },
    getAll: (limit = 50, offset = 0) => {
      lowdb.read();
      return {
        entries: lowdb.data.changelog.slice(offset, offset + limit),
        total: lowdb.data.changelog.length,
      };
    },
    delete: (id) => {
      lowdb.read();
      lowdb.data.changelog = lowdb.data.changelog.filter(e => e.id !== id);
      save();
    },
  },
};

module.exports = db;
