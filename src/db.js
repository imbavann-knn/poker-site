const { Pool } = require('pg');
require('dotenv').config();

// Parse DATABASE_URL manually to use explicit params (avoids SSL negotiation bugs)
function parseDbUrl(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: parseInt(u.port) || 5432,
      database: u.pathname.replace('/', ''),
      user: u.username,
      password: u.password,
    };
  } catch (e) {
    return null;
  }
}

const parsed = parseDbUrl(process.env.DATABASE_URL || '');
const sslConfig = { rejectUnauthorized: false, checkServerIdentity: () => undefined };
const poolConfig = parsed
  ? { ...parsed, ssl: sslConfig, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 }
  : { connectionString: process.env.DATABASE_URL, ssl: sslConfig };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected DB pool error', err.message);
});

module.exports = pool;
