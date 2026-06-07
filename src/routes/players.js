const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all players
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*,
        COUNT(DISTINCT sr.session_id) as sessions_played,
        COALESCE(SUM(sr.profit_loss), 0) as total_profit,
        COALESCE(MAX(sr.profit_loss), 0) as best_session,
        COALESCE(MIN(sr.profit_loss), 0) as worst_session
      FROM players p
      LEFT JOIN session_results sr ON sr.player_id = p.id
      GROUP BY p.id
      ORDER BY p.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single player with full stats
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const player = await db.query('SELECT * FROM players WHERE id = $1', [id]);
    if (!player.rows.length) return res.status(404).json({ error: 'Player not found' });

    const stats = await db.query(`
      SELECT
        COUNT(*) as sessions_played,
        COALESCE(SUM(profit_loss), 0) as total_profit,
        COALESCE(MAX(profit_loss), 0) as best_session,
        COALESCE(MIN(profit_loss), 0) as worst_session,
        COUNT(CASE WHEN profit_loss > 0 THEN 1 END) as wins,
        COUNT(CASE WHEN profit_loss < 0 THEN 1 END) as losses
      FROM session_results WHERE player_id = $1
    `, [id]);

    const history = await db.query(`
      SELECT sr.profit_loss, s.date, s.venue, s.blinds
      FROM session_results sr
      JOIN sessions s ON s.id = sr.session_id
      WHERE sr.player_id = $1
      ORDER BY s.date DESC
    `, [id]);

    res.json({ ...player.rows[0], stats: stats.rows[0], history: history.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create player
router.post('/', async (req, res) => {
  try {
    const { name, alias, emoji, joined_date, created_by } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = await db.query(
      `INSERT INTO players (name, alias, emoji, joined_date, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, alias || null, emoji || '♠', joined_date || new Date(), created_by || 'Anonymous']
    );

    await db.query(
      `INSERT INTO changelog (action, entity_type, entity_id, editor_name, description, new_value)
       VALUES ('create', 'player', $1, $2, $3, $4)`,
      [result.rows[0].id, created_by || 'Anonymous', `Added player: ${name}`, JSON.stringify(result.rows[0])]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update player
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, alias, emoji, editor_name } = req.body;
    const old = await db.query('SELECT * FROM players WHERE id = $1', [id]);
    if (!old.rows.length) return res.status(404).json({ error: 'Player not found' });

    const result = await db.query(
      `UPDATE players SET name = COALESCE($1, name), alias = COALESCE($2, alias), emoji = COALESCE($3, emoji)
       WHERE id = $4 RETURNING *`,
      [name, alias, emoji, id]
    );

    await db.query(
      `INSERT INTO changelog (action, entity_type, entity_id, editor_name, description, old_value, new_value)
       VALUES ('update', 'player', $1, $2, $3, $4, $5)`,
      [id, editor_name || 'Anonymous', `Updated player: ${name || old.rows[0].name}`,
       JSON.stringify(old.rows[0]), JSON.stringify(result.rows[0])]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
