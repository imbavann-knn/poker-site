const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/sessions/:id/results', (req, res) => {
  try {
    const { results, entered_by } = req.body;
    if (!results || !results.length) return res.status(400).json({ error: 'Results required' });
    const editor = entered_by || 'Anonymous';
    const inserted = [];
    for (const r of results) {
      const player = db.players.getById(r.player_id);
      const { old, current } = db.results.upsert(req.params.id, r.player_id, parseFloat(r.profit_loss), editor);
      const pn = player?.name || 'Player';
      const pnl = parseFloat(r.profit_loss) >= 0 ? '+$'+r.profit_loss : '-$'+Math.abs(r.profit_loss);
      db.changelog.add(old ? 'update' : 'create', 'result', req.params.id, editor,
        old ? `Updated ${pn}'s result: ${pnl}` : `Entered ${pn}'s result: ${pnl}`,
        old ? { profit_loss: old.profit_loss } : null, { profit_loss: r.profit_loss }
      );
      inserted.push(current);
    }
    // Mark session completed
    db.sessions.update(req.params.id, { status: 'completed' });
    res.status(201).json({ results: inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
