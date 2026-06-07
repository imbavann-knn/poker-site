const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all sessions
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT s.*,
        COUNT(DISTINCT sa.player_id) as attendee_count,
        COUNT(DISTINCT sr.player_id) as results_count
      FROM sessions s
      LEFT JOIN session_attendance sa ON sa.session_id = s.id
      LEFT JOIN session_results sr ON sr.session_id = s.id
    `;
    const params = [];
    if (status) { query += ' WHERE s.status = $1'; params.push(status); }
    query += ' GROUP BY s.id ORDER BY s.date DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single session with attendance + results
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await db.query('SELECT * FROM sessions WHERE id = $1', [id]);
    if (!session.rows.length) return res.status(404).json({ error: 'Session not found' });

    const attendance = await db.query(`
      SELECT sa.*, p.name, p.alias, p.emoji
      FROM session_attendance sa
      JOIN players p ON p.id = sa.player_id
      WHERE sa.session_id = $1
      ORDER BY sa.added_at ASC
    `, [id]);

    const results = await db.query(`
      SELECT sr.*, p.name, p.alias, p.emoji
      FROM session_results sr
      JOIN players p ON p.id = sr.player_id
      WHERE sr.session_id = $1
      ORDER BY sr.profit_loss DESC
    `, [id]);

    res.json({ ...session.rows[0], attendance: attendance.rows, results: results.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create session
router.post('/', async (req, res) => {
  try {
    const { date, time, venue, host, blinds, notes, created_by } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const result = await db.query(
      `INSERT INTO sessions (date, time, venue, host, blinds, notes, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'planned') RETURNING *`,
      [date, time || '20:00', venue || '', host || '', blinds || '0.10/0.20', notes || '', created_by || 'Anonymous']
    );

    await db.query(
      `INSERT INTO changelog (action, entity_type, entity_id, editor_name, description, new_value)
       VALUES ('create', 'session', $1, $2, $3, $4)`,
      [result.rows[0].id, created_by || 'Anonymous', `Created session for ${date}`, JSON.stringify(result.rows[0])]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update session
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, venue, host, blinds, notes, status, editor_name } = req.body;

    const old = await db.query('SELECT * FROM sessions WHERE id = $1', [id]);
    if (!old.rows.length) return res.status(404).json({ error: 'Session not found' });

    const result = await db.query(`
      UPDATE sessions SET
        date = COALESCE($1, date),
        time = COALESCE($2, time),
        venue = COALESCE($3, venue),
        host = COALESCE($4, host),
        blinds = COALESCE($5, blinds),
        notes = COALESCE($6, notes),
        status = COALESCE($7, status),
        updated_at = NOW()
      WHERE id = $8 RETURNING *`,
      [date, time, venue, host, blinds, notes, status, id]
    );

    await db.query(
      `INSERT INTO changelog (action, entity_type, entity_id, editor_name, description, old_value, new_value)
       VALUES ('update', 'session', $1, $2, $3, $4, $5)`,
      [id, editor_name || 'Anonymous', `Updated session ${date || old.rows[0].date}`,
       JSON.stringify(old.rows[0]), JSON.stringify(result.rows[0])]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add attendance
router.post('/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params;
    const { player_id, added_by } = req.body;

    const player = await db.query('SELECT name FROM players WHERE id = $1', [player_id]);
    if (!player.rows.length) return res.status(404).json({ error: 'Player not found' });

    const result = await db.query(
      `INSERT INTO session_attendance (session_id, player_id, added_by)
       VALUES ($1, $2, $3) ON CONFLICT (session_id, player_id) DO NOTHING RETURNING *`,
      [id, player_id, added_by || 'Anonymous']
    );

    await db.query(
      `INSERT INTO changelog (action, entity_type, entity_id, editor_name, description)
       VALUES ('create', 'attendance', $1, $2, $3)`,
      [id, added_by || 'Anonymous', `Added ${player.rows[0].name} to session`]
    );

    res.status(201).json(result.rows[0] || { message: 'Already in attendance' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove attendance
router.delete('/:id/attendance/:player_id', async (req, res) => {
  try {
    const { id, player_id } = req.params;
    const { editor_name } = req.body;

    const player = await db.query('SELECT name FROM players WHERE id = $1', [player_id]);
    await db.query(
      'DELETE FROM session_attendance WHERE session_id = $1 AND player_id = $2',
      [id, player_id]
    );

    await db.query(
      `INSERT INTO changelog (action, entity_type, entity_id, editor_name, description)
       VALUES ('delete', 'attendance', $1, $2, $3)`,
      [id, editor_name || 'Anonymous', `Removed ${player.rows[0]?.name || 'player'} from session`]
    );

    res.json({ message: 'Removed from attendance' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
