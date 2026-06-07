require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// JSON DB initialises on require
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ——— API routes FIRST (before static/catch-all) ———
app.use('/api/players', require('./routes/players'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api', require('./routes/results'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/changelog', require('./routes/changelog'));
app.use('/api/admin', require('./routes/admin'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/api/version', (req, res) => res.json({ version: 'LOWDB-v1', db: 'json-file' }));

// ——— Static files ———
app.use(express.static(path.join(__dirname, '../public')));

// ——— Clean URL routing (serve .html for extension-less paths) ———
const pages = ['sessions', 'leaderboard', 'players', 'changelog', 'session', 'admin'];
pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `../public/${page}.html`));
  });
});

// ——— Fallback ———
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🃏 Wholesome ALL IN — port ${PORT}`);
});
