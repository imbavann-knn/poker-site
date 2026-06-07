require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/players', require('./routes/players'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api', require('./routes/results'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/changelog', require('./routes/changelog'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Init DB tables with retry
async function initDB(retries = 5, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      // Run each table creation separately for reliability
      await db.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
      await db.query(`CREATE TABLE IF NOT EXISTS players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        alias VARCHAR(100),
        emoji VARCHAR(10) DEFAULT '♠',
        joined_date DATE DEFAULT CURRENT_DATE,
        created_by VARCHAR(100) DEFAULT 'System',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL,
        time VARCHAR(10) DEFAULT '20:00',
        venue VARCHAR(200),
        host VARCHAR(100),
        blinds VARCHAR(20) DEFAULT '0.10/0.20',
        status VARCHAR(20) DEFAULT 'planned',
        notes TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS session_attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        player_id UUID REFERENCES players(id) ON DELETE CASCADE,
        added_by VARCHAR(100),
        added_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(session_id, player_id)
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS session_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        player_id UUID REFERENCES players(id) ON DELETE CASCADE,
        profit_loss DECIMAL(10,2) NOT NULL DEFAULT 0,
        entered_by VARCHAR(100),
        entered_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(session_id, player_id)
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS changelog (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID,
        editor_name VARCHAR(100) NOT NULL,
        description TEXT,
        old_value JSONB,
        new_value JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      console.log('✅ Database schema ready');
      return;
    } catch (err) {
      console.error(`DB init attempt ${i + 1}/${retries} failed:`, err.message);
      if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('❌ DB init failed after all retries — app will still run, retrying on next request');
}

// Clean URL routing — serve correct HTML for each page
const pages = ['sessions', 'leaderboard', 'players', 'changelog', 'session', 'admin'];
pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `../public/${page}.html`));
  });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, async () => {
  console.log(`🃏 Wholesome ALL IN running on port ${PORT}`);
  try {
    await initDB();
  } catch (err) {
    console.error('DB init error:', err.message);
  }
});
