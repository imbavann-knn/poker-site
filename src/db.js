const postgres = require('postgres');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || '';
const host = dbUrl.split('@')[1]?.split('/')[0] || 'unknown';
console.log('🔌 Connecting to DB host:', host);

const sql = postgres(dbUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
});

// Wrap to expose a .query() compatible interface used throughout the app
const pool = {
  query: async (text, params = []) => {
    // Convert $1,$2 style params to postgres tagged template
    const result = await sql.unsafe(text, params);
    return { rows: Array.from(result) };
  },
};

module.exports = pool;
