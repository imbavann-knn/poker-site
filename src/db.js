const { Pool } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || '';

const pool = new Pool({
  connectionString: dbUrl,
  // SSL handled via ?sslmode= in connection string
});

pool.on('error', (err) => {
  console.error('Unexpected DB error', err);
});

module.exports = pool;
