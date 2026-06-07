const express = require('express');
const router = express.Router();
const db = require('../db');

// POST submit results for a session (bulk)
router.post('/sessions/:id/results', async (req, res) => {
  try {
    const { id } = req.params;
    const { results, entered_by } = req.body;
    // results = [{ player_id, profit_loss }, ...]

    if (!results || !results.length) return res.status(400).json({ error: 'Results required' });

    const inserted = [];
    for (const r of results) {
      const existing = await db.query(
        'SELECT * FROM session_results WHERE session_id = $1 AND player_id = $2',
        [id, r.player_id]
      );
      let row;
      if (existing.rows.length) {
        const old = existing.rows[0];
        row = await db.query(
          `UPDATE session_results SET profit_loss = $1, entered_by = $2, entered_at = NOW()
           WHERE session_id = $3 AND player_id = $4 RETURNING *`,
          [r.profit_loss, entered_by || 'Anonymous', id, r.player_id]
        );
        const player = await db.query('SELECT name FROM players WHERE id = $1', [r.player_id]);
        await db.query(
          `INSERT INTO changelog (action, entity_type, entity_id, editor_name, description, old_value, new_value)
           VALUES ('update', 'result', $1, $2, $3, $4, $5)`,
          [id, entered_by || 'Anonymous',
           `Updated ${player.rows[0]?.name}'s result`,
           JSON.stringify({ profit_loss: old.profit_loss }),
           JSON.stringify({ profit_loss: r.profit_loss })]
        );
      } else {
        row = await db.query(
          `INSERT INTO session_results (session_id, player_id, profit_loss, entered_by)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [id, r.player_id, r.profit_loss, entered_by || 'Anonymous']
        );
        const player = await db.query('SELECT name FROM players WHERE id = $1', [r.player_id]);
        await db.query(
          `INSERT INTO changelog (action, entity_type, entity_id, editor_name, description, new_value)
           VALUES ('create', 'result', $1, $2, $3, $4)`,
          [id, entered_by || 'Anonymous',
           `Entered ${player.rows[0]?.name}'s result: ${r.profit_loss >= 0 ? '+' : ''}${r.profit_loss}`,
           JSON.stringify({ profit_loss: r.profit_loss })]
        );
      }
      inserted.push(row.rows[0]);
    }

    // Mark session as completed
    await db.query(`UPDATE sessions SET status = 'completed', updated_at = NOW() WHERE id = $1`, [id]);

    res.status(201).json({ results: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
