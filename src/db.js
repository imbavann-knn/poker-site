const { Pool } = require('pg');
require('dotenv').config();

// NODE_TLS_REJECT_UNAUTHORIZED=0 is set in Railway env
// Try direct connection params with ssl options
const dbUrl = process.env.DATABASE_URL || '';
const host = dbUrl.split('@')[1]?.split(':')[0] || 'unknown';
const port = parseInt(dbUrl.split('@')[1]?.split(':')[1]?.split('/')[0]) || 5432;
const database = dbUrl.split('/').pop()?.split('?')[0] || 'railway';
const user = dbUrl.split('://')[1]?.split(':')[0] || 'postgres';
const password = dbUrl.split('://')[1]?.split(':')[1]?.split('@')[0] || '';

console.log(`🔌 DB: ${user}@${host}:${port}/${database}`);

const pool = new Pool({
  host, port, database, user, password,
  ssl: false,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Pool error:', err.message);
});

module.exports = pool;
