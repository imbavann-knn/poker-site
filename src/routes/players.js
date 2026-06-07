const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    res.json(db.players.getAll());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const p = db.players.getById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Player not found' });
    res.json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', (req, res) => {
  try {
    const { name, alias, emoji, joined_date, created_by } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const player = db.players.create({ name, alias: alias||null, emoji: emoji||'♠', joined_date: joined_date||new Date().toISOString().slice(0,10), created_by: created_by||'Anonymous' });
    db.changelog.add('create','player',player.id, created_by||'Anonymous', `Added player: ${name}`, null, player);
    res.status(201).json(player);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', (req, res) => {
  try {
    const { name, alias, emoji, editor_name } = req.body;
    const old = db.players.getById(req.params.id);
    if (!old) return res.status(404).json({ error: 'Player not found' });
    const updated = db.players.update(req.params.id, { name, alias, emoji });
    db.changelog.add('update','player',req.params.id, editor_name||'Anonymous', `Updated player: ${name||old.name}`, old, updated);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
